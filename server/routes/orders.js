import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import auth, { requireAdmin, requireManagerOrOwner } from '../middleware/auth.js';

const router = express.Router();

// Helper: get stock from object checking multiple keys
9// UPDATED: Now returns the MAXIMUM value found to handle inconsistent data (e.g. quantity=5, stockCount=0)
const getStockFromVariant = (variant) => {
  if (!variant) return null;
  const keys = ['stockCount', 'stock', 'quantity', 'qty', 'count', 'remaining', 'available', 'stock_quantity'];
  const values = [];
  
  for (const key of keys) {
    if (variant[key] !== undefined && variant[key] !== null) {
      const val = Number(variant[key]);
      if (Number.isFinite(val)) {
        values.push(val);
      }
    }
  }
  
  if (values.length === 0) return null;
  return Math.max(...values);
};

// Helper: convert any numeric-ish value to a number or null
const toNumberOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

// Helper: convert any numeric-ish value to a non-negative number, default 0
const toNumberOrZero = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, num);
};

// Helper: find variant index by name/sku (case-insensitive, trimmed)
const findVariantIndex = (list, variantName, variantSku) => {
  if (!Array.isArray(list) || list.length === 0) return -1;
  const nameNorm = variantName ? variantName.trim().toLowerCase() : null;
  const skuNorm = variantSku ? variantSku.trim().toLowerCase() : null;
  const exactIdx = list.findIndex((v) => {
    const vName = v?.name ? v.name.trim().toLowerCase() : null;
    const vSku = v?.sku ? v.sku.trim().toLowerCase() : null;
    return (nameNorm && vName === nameNorm) || (skuNorm && vSku === skuNorm);
  });
  if (exactIdx !== -1) return exactIdx;

  // Fallback: partial includes for noisy names
  if (nameNorm) {
    const partialIdx = list.findIndex((v) => {
      const vName = v?.name ? v.name.trim().toLowerCase() : null;
      return vName && vName.includes(nameNorm);
    });
    if (partialIdx !== -1) return partialIdx;
  }

  // Fallback: Agar ro'yxatda faqat 1 ta variant bo'lsa va biz qidirayotgan variant topilmasa,
  // o'sha bitta variantni qaytaramiz (chunki katta ehtimol bilan bu o'sha)
  if (list.length === 1) {
    return 0;
  }

  // Fallback: if nothing found, return -1
  return -1;
};

// Get orders
router.get('/', auth, async (req, res) => {
  try {
    const Store = (await import('../models/Store.js')).default;
    const filter = {};
    
    // Owner: can see all orders
    if (req.user.role === 'owner') {
      // no filter
    } else if (req.user.role === 'admin') {
      // Admin sees only orders from their own stores
      const adminStores = await Store.find({ createdBy: req.user.id }).select('_id');
      const adminStoreIds = adminStores.map(store => store._id);
      if (adminStoreIds.length > 0) {
        filter.storeId = { $in: adminStoreIds };
      } else {
        // Admin has no stores - return empty
        return res.json([]);
      }
    } else if (req.user.role === 'manager') {
      if (!req.user.managerOfShop) {
        return res.status(403).json({ message: 'Menedjerga magazin biriktirilmagan' });
      }
      filter.storeId = req.user.managerOfShop;
    } else if (req.user.role === 'xodim') {
      // Xodim faqat o'ziga biriktirilgan magazinning buyurtmalarini ko'radi
      if (!req.user.managerOfShop) {
        return res.status(403).json({ message: 'Xodimga magazin biriktirilmagan' });
      }
      filter.storeId = req.user.managerOfShop;
    } else if (req.user.role === 'helper') {
      if (!req.user.helperPermissions?.orders) {
        return res.status(403).json({ message: 'Buyurtmalar bo\'limiga ruxsat yo\'q' });
      }
      if (!req.user.managerOfShop) {
        return res.status(403).json({ message: 'Yordamchiga magazin biriktirilmagan' });
      }
      filter.storeId = req.user.managerOfShop;
    } else {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }

    const orders = await Order.find(filter)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Buyurtmalarni yuklashda xatolik' });
  }
});

// Get user's orders
router.get('/my', auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: 'Buyurtmalarni yuklashda xatolik' });
  }
});

// Create new order (automatically splits by store if items from multiple stores)
router.post('/', auth, async (req, res) => {
  try {
    const { items, total, deliveryAddress } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Buyurtma mahsulotlari kerak' });
    }

    if (!total || total <= 0) {
      return res.status(400).json({ message: 'Buyurtma summasi noto\'g\'ri' });
    }

    if (!deliveryAddress || !deliveryAddress.address) {
      return res.status(400).json({ message: 'Yetkazib berish manzili kerak' });
    }

    // Group items by store
    const itemsByStore = {};
    for (const item of items) {
      let productId = item.productId || item.id;
      let variantName = item.variantName || null;
      let parentProductId = item.parentProductId || null;
      
      // Если это вариант (ID содержит _variant_), извлекаем родительский ID
      let lookupId = productId;
      if (productId && productId.includes('_variant_')) {
        const parts = productId.split('_variant_');
        lookupId = parts[0];
        if (!variantName) {
          variantName = parts[1] || null;
        }
        if (!parentProductId) {
          parentProductId = lookupId;
        }
      }
      
      // Mahsulotni magazin bilan birga olishga harakat qilamiz (POST tizim mahsulotlari uchun ham)
      const product = await Product.findById(lookupId).select('store currency userId createdBy name');
      
      if (!product) {
        return res.status(400).json({ message: `Mahsulot "${item.name}" topilmadi` });
      }

      let storeId = product.store ? product.store.toString() : null;

      // Agar product.store bo'sh bo'lsa, uni POST tizim ma'lumotlari orqali magazinga bog'lashga harakat qilamiz
      if (!storeId) {
        const Store = (await import('../models/Store.js')).default;

        // 1) postUserId bo'yicha qidirish (POST tizimdan kelgan mahsulotlar uchun)
        let store = null;
        if (product.userId) {
          store = await Store.findOne({ postUserId: product.userId }).select('_id');
        }

        // 2) Agar topilmasa, createdBy bo'yicha magazin topishga urinamiz
        if (!store && product.createdBy) {
          store = await Store.findOne({ createdBy: product.createdBy }).select('_id');
        }

        // 3) Hali ham topilmasa, mavjud birinchi magazinni fallback sifatida ishlatamiz
        if (!store) {
          store = await Store.findOne({}).select('_id');
        }

        if (store) {
          storeId = store._id.toString();
          // Mahsulotni shu magazinga biriktirib qo'yamiz, shunda keyingi safar xatolik bo'lmaydi
          product.store = store._id;
          await product.save();
        } else {
          // Umuman magazinlar topilmagan holat
          return res.status(400).json({ message: `Hech qanday magazin topilmadi, iltimos avval magazin yarating` });
        }
      }
      
      if (!itemsByStore[storeId]) {
        itemsByStore[storeId] = [];
      }
      itemsByStore[storeId].push({
        productId,
        name: item.name,
        price: parseFloat(item.price),
        currency: item.currency || product.currency || "UZS",
        quantity: item.quantity,
        image: item.image,
        variantName,
        parentProductId,
      });
    }

    // Create separate orders for each store
    const createdOrders = [];
    for (const [storeId, storeItems] of Object.entries(itemsByStore)) {
      const storeTotal = storeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const order = new Order({
        userId: req.user.id,
        storeId,
        items: storeItems,
        total: storeTotal,
        deliveryAddress: {
          address: deliveryAddress.address,
          city: deliveryAddress.city || '',
          phone: deliveryAddress.phone || ''
        },
        status: 'pending',
        orderNumber: generateOrderNumber()
      });

      await order.save();
      await order.populate('userId', 'name email phone');
      createdOrders.push(order);
      
      // Har bir mahsulotning stockCount'ini kamaytirish
      for (const item of storeItems) {
        let productId = item.productId;
        let variantName = item.variantName ? item.variantName.trim() : null;
        let variantSku = item.variantSku ? item.variantSku.trim() : null;
        let touchedVariantSummaries = false;
        let touchedVariants = false;
        let touchedMainStock = false;
        
        // Agar variant bo'lsa, parent product ID'sini olish
        if (productId && productId.includes('_variant_')) {
          const parts = productId.split('_variant_');
          productId = parts[0];
          if (!variantName) {
            variantName = parts[1] ? decodeURIComponent(parts[1]).trim() : null;
          }
        }
        
        const product = await Product.findById(productId);
        if (product) {
          // Agar variant nomi bo'lsa, variant stockini yangilashga harakat qilamiz
          if (variantName) {
            let variantFound = false;

            // 1. variantSummaries'ni tekshirish
            if (Array.isArray(product.variantSummaries)) {
              const variantIndex = findVariantIndex(product.variantSummaries, variantName, variantSku);
              if (variantIndex !== -1) {
                const currentStock = getStockFromVariant(product.variantSummaries[variantIndex]);
                // Agar stock ma'lumoti bo'lsa yangilaymiz
                if (currentStock !== null) {
                  const newStock = Math.max(0, currentStock - item.quantity);
                  product.variantSummaries[variantIndex].stockCount = newStock;
                  product.variantSummaries[variantIndex].stock = newStock;
                  // Eskirgan kalitlarni ham yangilab qo'yamiz agar ular bo'lsa
                  if (product.variantSummaries[variantIndex].quantity !== undefined) product.variantSummaries[variantIndex].quantity = newStock;
                  if (product.variantSummaries[variantIndex].qty !== undefined) product.variantSummaries[variantIndex].qty = newStock;
                  
                  touchedVariantSummaries = true;
                  variantFound = true;
                }
              }
            }

            // 2. variants array'da ham yangilash
            if (Array.isArray(product.variants)) {
              const vIdx = findVariantIndex(product.variants, variantName, variantSku);
              if (vIdx !== -1) {
                const currentStock = getStockFromVariant(product.variants[vIdx]);
                // Agar stock ma'lumoti bo'lsa yangilaymiz
                if (currentStock !== null) {
                   const newStock = Math.max(0, currentStock - item.quantity);
                   product.variants[vIdx].stockCount = newStock;
                   product.variants[vIdx].stock = newStock;
                   // Eskirgan kalitlarni ham yangilab qo'yamiz
                   if (product.variants[vIdx].quantity !== undefined) product.variants[vIdx].quantity = newStock;
                   if (product.variants[vIdx].qty !== undefined) product.variants[vIdx].qty = newStock;

                   touchedVariants = true;
                   variantFound = true;
                }
              }
            }

            // Agar variant nomi bo'lib, lekin hech qayerdan topilmasa, nima qilish kerak?
            // Hozircha hech narsa qilmaymiz, chunki noto'g'ri variantni buzib qo'yishimiz mumkin.
            // Log yozamiz:
            if (!variantFound) {
              console.warn(`Variant not found for update: ${product.name} - ${variantName}`);
            }

          } else {
            // Asosiy mahsulot stockCount'ini kamaytirish
            // Check multiple fields for current stock and take the MAX value
            // This handles cases where data is inconsistent (e.g. quantity=5, stockCount=0)
            const stockValues = [
              product.stockCount,
              product.stock,
              product.quantity,
              product.qty,
              product.count,
              product.available,
              product.stock_quantity,
              product.availableQuantity
            ].filter(v => v !== undefined && v !== null && !isNaN(v));
            
            // If we found any values, take the max. Otherwise default to 0.
            let currentStock = stockValues.length > 0 ? Math.max(...stockValues) : 0;
            
            const newStock = Math.max(0, currentStock - item.quantity);
            
            // Update ALL standard fields
            product.stockCount = newStock;
            product.stock = newStock;
            product.quantity = newStock; 
            
            // Sync all other fields if they exist in the document
            // We use direct assignment to ensure they are saved if they exist in schema
            if (product.qty !== undefined) product.qty = newStock;
            if (product.count !== undefined) product.count = newStock;
            if (product.available !== undefined) product.available = newStock;
            if (product.stock_quantity !== undefined) product.stock_quantity = newStock;
            if (product.availableQuantity !== undefined) product.availableQuantity = newStock;

            product.inStock = newStock > 0;
            touchedMainStock = true;
          }
          if (touchedVariantSummaries) product.markModified('variantSummaries');
          if (touchedVariants) product.markModified('variants');
          if (touchedMainStock) product.markModified('stockCount');
          await product.save();
          console.log(`Stock updated for ${product.name}: -${item.quantity}`);
        }
      }
    }

    console.log('Orders created:', createdOrders.length);
    
    // Return array if multiple orders, single order if one
    if (createdOrders.length === 1) {
      res.status(201).json(createdOrders[0]);
    } else {
      res.status(201).json({ 
        message: `${createdOrders.length} ta buyurtma yaratildi (har bir magazin uchun alohida)`,
        orders: createdOrders 
      });
    }
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Buyurtma yaratishda xatolik' });
  }
});

// Update order status (admin/owner; manager for own store; helper for own store with orders permission)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Noto\'g\'ri status' });
    }

    // Load order to check store scoping and permissions
    const existing = await Order.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Buyurtma topilmadi' });
    }

    // Role checks
    const role = req.user.role;
    if (role === 'admin' || role === 'owner') {
      // allowed
    } else if (role === 'manager') {
      if (!req.user.managerOfShop || String(existing.storeId) !== String(req.user.managerOfShop)) {
        return res.status(403).json({ message: 'Faqat o\'z magaziningiz buyurtmalari statusini yangilashingiz mumkin' });
      }
    } else if (role === 'helper') {
      if (!req.user.helperPermissions?.orders || !req.user.managerOfShop || String(existing.storeId) !== String(req.user.managerOfShop)) {
        return res.status(403).json({ message: 'Ruxsat yo\'q' });
      }
    } else {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }

    existing.status = status;
    existing.updatedAt = new Date();
    await existing.save();

    const order = await Order.findById(existing._id).populate('userId', 'name email phone');

    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Buyurtma statusini yangilashda xatolik' });
  }
});

// Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Buyurtma topilmadi' });
    }

    // Check if user owns the order or is admin
    if (order.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Buyurtmani yuklashda xatolik' });
  }
});

// Delete order (admin/owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Buyurtma topilmadi' });
    }

    // Only admin and owner can delete orders
    if (!['admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Buyurtmani o\'chirish uchun ruxsat yo\'q' });
    }

    await Order.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Buyurtma o\'chirildi' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Buyurtmani o\'chirishda xatolik' });
  }
});

// Generate order number
function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}${random}`;
}

export default router;
