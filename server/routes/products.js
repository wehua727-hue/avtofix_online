import express from "express";
import path from "path";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import auth from "../middleware/auth.js";
import {
  uploadSingleImage,
  processAndStoreImage,
  removeImageByUrl,
} from "../utils/upload.js";

const router = express.Router();

// Keyingi mahsulot kodini olish (magazin bo'yicha, variantlar ham hisobga olinadi)
const getNextProductCode = async (storeId) => {
  if (!storeId) {
    return "1";
  }

  // Shu magazindagi barcha mahsulotlarni topish (sku va variantSummaries bilan)
  const products = await Product.find({
    store: storeId,
  }).select('sku variantSummaries').lean();

  const allCodes = [];

  // Mahsulotlarning sku larini yig'ish
  products.forEach(p => {
    if (p.sku && /^\d+$/.test(p.sku)) {
      const code = parseInt(p.sku, 10);
      if (!isNaN(code)) allCodes.push(code);
    }

    // Variantlarning sku larini ham yig'ish
    if (Array.isArray(p.variantSummaries)) {
      p.variantSummaries.forEach(v => {
        if (v.sku && /^\d+$/.test(v.sku)) {
          const code = parseInt(v.sku, 10);
          if (!isNaN(code)) allCodes.push(code);
        }
      });
    }
  });

  if (allCodes.length > 0) {
    const maxCode = Math.max(...allCodes);
    return (maxCode + 1).toString();
  }

  // Agar raqamli sku topilmasa, 1 dan boshlash
  return "1";
};

// API: Keyingi mahsulot kodini olish (magazin bo'yicha)
router.get("/next-code", async (req, res) => {
  try {
    const { storeId } = req.query;
    const nextCode = await getNextProductCode(storeId);
    res.json({ code: nextCode });
  } catch (error) {
    console.error("Error getting next code:", error);
    res.status(500).json({ error: "Keyingi kodni olishda xatolik" });
  }
});

// Search products with autocomplete
router.get("/search", async (req, res) => {
  try {
    const { q, minPrice, maxPrice, category, limit = 10 } = req.query;

    // Barcha ko'rinadigan mahsulotlar (isHidden != true)
    const filter = {
      $or: [{ isHidden: { $ne: true } }, { isHidden: { $exists: false } }]
    };

    // Text search
    if (q && q.trim()) {
      // Transliteration helper
      const latinToCyrillicMap = {
        'a': 'а', 'b': 'б', 'c': 'с', 'd': 'д', 'e': 'е', 'f': 'ф',
        'g': 'г', 'h': 'х', 'i': 'и', 'j': 'ж', 'k': 'к', 'l': 'л',
        'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'q': 'к', 'r': 'р',
        's': 'с', 't': 'т', 'u': 'у', 'v': 'в', 'x': 'х', 'y': 'й',
        'z': 'з', "'": 'ъ', "sh": "ш", "ch": "ч", "yo": "ё", "yu": "ю", "ya": "я", "o'": "ў", "g'": "ғ"
      };
      const cyrillicToLatinMap = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'x', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': "'",
        'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': "o'", 'ғ': "g'"
      };

      const transliterate = (text, toCyrillic = true) => {
        let result = text.toLowerCase();
        const map = toCyrillic ? latinToCyrillicMap : cyrillicToLatinMap;
        if (toCyrillic) {
          result = result
            .replace(/sh/g, 'ш').replace(/ch/g, 'ч').replace(/yo/g, 'ё')
            .replace(/yu/g, 'ю').replace(/ya/g, 'я').replace(/o'/g, 'ў').replace(/g'/g, 'ғ');
        }
        return result.split('').map(char => map[char] || char).join('');
      };

      const qCyrillic = transliterate(q.trim(), true);
      const isCyrillic = /[а-яА-ЯёЁ]/.test(q);
      const altQ = transliterate(q.trim(), !isCyrillic);

      const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
      const escapedQuery = escapeRegex(q.trim());
      const escapedAltQuery = escapeRegex(altQ);

      const combinedRegexSrc = escapedQuery === escapedAltQuery
        ? escapedQuery
        : `${escapedQuery}|${escapedAltQuery}`;

      console.log('🔍 Search query:', q, '-> regex:', combinedRegexSrc);

      filter.$and = [
        { $or: filter.$or },
        {
          $or: [
            { name: { $regex: combinedRegexSrc, $options: 'i' } },
            { description: { $regex: combinedRegexSrc, $options: 'i' } },
            { category: { $regex: combinedRegexSrc, $options: 'i' } },
            { sku: { $regex: combinedRegexSrc, $options: 'i' } },
            { code: { $regex: combinedRegexSrc, $options: 'i' } },
            { catalogNumber: { $regex: combinedRegexSrc, $options: 'i' } },
            // Variantlar bo'yicha qidiruv
            { "variantSummaries.name": { $regex: combinedRegexSrc, $options: 'i' } },
            { "variantSummaries.sku": { $regex: combinedRegexSrc, $options: 'i' } },
            { "variantSummaries.code": { $regex: combinedRegexSrc, $options: 'i' } },
            { "variantSummaries.catalogNumber": { $regex: combinedRegexSrc, $options: 'i' } }
          ]
        }
      ];
      delete filter.$or;
    }

    // Price filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Category filter
    if (category) {
      filter.category = { $regex: category, $options: 'i' };
    }

    const products = await Product.find(filter)
      .populate('store', 'name color')
      .select('name price imageUrl category store')
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ error: "Qidiruvda xatolik" });
  }
});

// Get search suggestions (autocomplete)
router.get("/suggestions", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json([]);
    }

    // Transliteration helper
    const latinToCyrillicMap = {
      'a': 'а', 'b': 'б', 'c': 'ц', 'd': 'д', 'e': 'е', 'f': 'ф',
      'g': 'г', 'h': 'х', 'i': 'и', 'j': 'ж', 'k': 'к', 'l': 'л',
      'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'q': 'к', 'r': 'р',
      's': 'с', 't': 'т', 'u': 'у', 'v': 'в', 'x': 'х', 'y': 'й',
      'z': 'з', "'": 'ъ', "sh": "ш", "ch": "ч", "yo": "ё", "yu": "ю", "ya": "я", "o'": "ў", "g'": "ғ"
    };
    const cyrillicToLatinMap = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'x', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': "'",
      'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': "o'", 'ғ': "g'"
    };

    const transliterate = (text, toCyrillic = true) => {
      let result = text.toLowerCase();
      const map = toCyrillic ? latinToCyrillicMap : cyrillicToLatinMap;
      if (toCyrillic) {
        result = result
          .replace(/sh/g, 'ш').replace(/ch/g, 'ч').replace(/yo/g, 'ё')
          .replace(/yu/g, 'ю').replace(/ya/g, 'я').replace(/o'/g, 'ў').replace(/g'/g, 'ғ');
      }
      return result.split('').map(char => map[char] || char).join('');
    };

    const qCyrillic = transliterate(q.trim(), true);
    const qLatin = transliterate(qCyrillic, false); // Back to Latin to be safe (or just use q)
    // Actually q might already be cyrillic.
    // Safe approach: use q and its transliterated version.
    // If q is "salom" (latin), alt is "салом".
    // If q is "салом" (cyrillic), alt is "salom".
    // Simple check: does q contain cyrillic chars?
    const isCyrillic = /[а-яА-ЯёЁ]/.test(q);
    const altQ = transliterate(q.trim(), !isCyrillic);

    // Create Regex that matches EITHER q OR altQ
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
    const escapedQuery = escapeRegex(q.trim());
    const escapedAltQuery = escapeRegex(altQ);

    // Combine them: (q|altQ)
    const combinedRegexSrc = escapedQuery === escapedAltQuery
      ? escapedQuery
      : `${escapedQuery}|${escapedAltQuery}`;

    // Barcha ko'rinadigan mahsulotlar (isHidden != true)
    const filter = {
      $or: [{ isHidden: { $ne: true } }, { isHidden: { $exists: false } }]
    };

    filter.$and = [
      { $or: filter.$or },
      {
        $or: [
          { name: { $regex: combinedRegexSrc, $options: 'i' } },
          { sku: { $regex: combinedRegexSrc, $options: 'i' } },
          { code: { $regex: combinedRegexSrc, $options: 'i' } },
          { catalogNumber: { $regex: combinedRegexSrc, $options: 'i' } },
          // Variantlar bo'yicha qidiruv
          { "variantSummaries.name": { $regex: combinedRegexSrc, $options: 'i' } },
          { "variantSummaries.sku": { $regex: combinedRegexSrc, $options: 'i' } },
          { "variantSummaries.code": { $regex: combinedRegexSrc, $options: 'i' } },
          { "variantSummaries.catalogNumber": { $regex: combinedRegexSrc, $options: 'i' } }
        ]
      }
    ];
    delete filter.$or;

    const products = await Product.find(filter)
      .select('name category variantSummaries')
      .limit(10);

    // Collect matching names (Product Name OR Variant Name)
    const suggestionsSet = new Set();
    const searchRegex = new RegExp(combinedRegexSrc, 'i');

    products.forEach(p => {
      // 1. Check Product Name
      if (searchRegex.test(p.name)) {
        suggestionsSet.add(p.name);
      }

      // 2. Check Variants
      if (p.variantSummaries && p.variantSummaries.length > 0) {
        p.variantSummaries.forEach(v => {
          if (v.name && searchRegex.test(v.name)) {
            suggestionsSet.add(v.name);
          }
          // Also check variant Code/SKU if needed, but user asked for NAME to be shown.
          // If the user searched for a CODE, we should probably show the NAME of the product/variant found.
          // But purely for suggestions autocomplete, showing the NAME is standard.
        });
      }

      // If we found it via Code/SKU but name didn't match, we should still show the product name?
      // Yes. If product SKU matches "123", suggestion should be "Product Name".
      if (!searchRegex.test(p.name)) {
        // Agar product name match qilmasa (demak SKU yoki Code match qilgan),
        // lekin biz baribir uning nomini suggestionga qo'shishimiz kerak.
        suggestionsSet.add(p.name);
      }
    });

    const suggestions = [...suggestionsSet].slice(0, 10);

    res.json(suggestions);
  } catch (error) {
    console.error("Error getting suggestions:", error);
    res.status(500).json({ error: "Tavsiyalarni olishda xatolik" });
  }
});

// Variantlarni alohida mahsulot sifatida qaytarish
const expandProductVariants = (product) => {
  const expanded = [];

  // Asosiy mahsulotni qo'shish
  expanded.push({
    ...product,
    isVariant: false,
    variantIndex: null,
    parentProductId: null,
  });

  // Variantlarni tekshirish - variantSummaries yoki variants
  let variants = [];
  if (Array.isArray(product.variantSummaries) && product.variantSummaries.length > 0) {
    variants = product.variantSummaries;
  } else if (Array.isArray(product.variants) && product.variants.length > 0) {
    variants = product.variants;
  }

  // Agar variantlar bo'lmasa, faqat asosiy mahsulotni qaytaramiz
  if (variants.length === 0) {
    return expanded;
  }

  // Har bir variantni alohida mahsulot sifatida qo'shish
  variants.forEach((variant, index) => {
    // Variant bo'sh yoki string bo'lsa, o'tkazib yuboramiz
    if (!variant) return;
    if (typeof variant === 'string' && !variant.trim()) return;

    // Variant nomini olamiz
    const variantName = typeof variant === 'string' ? variant : (variant.name || '');
    if (!variantName) return;

    // Variant rasmlarini to'g'ri olamiz - images array'dan
    let variantImages = [];
    if (typeof variant === 'object') {
      // Birinchi images array'dan olamiz
      if (Array.isArray(variant.images) && variant.images.length > 0) {
        variantImages = variant.images.filter(img => img && typeof img === 'string');
      }
      // Agar images bo'lmasa, imagePaths'dan olamiz
      else if (Array.isArray(variant.imagePaths) && variant.imagePaths.length > 0) {
        variantImages = variant.imagePaths.filter(img => img && typeof img === 'string');
      }
      // Agar images va imagePaths bo'lmasa, imageUrl'dan olamiz
      else if (variant.imageUrl && typeof variant.imageUrl === 'string') {
        variantImages = [variant.imageUrl];
      }
    }

    // Variant object'ini yaratamiz
    // Variantning stokini olish - agar variant'da bo'lmasa, parent mahsulotning stokini olish
    let variantStockCount = null;
    if (typeof variant === 'object' && variant.stockCount !== undefined && variant.stockCount !== null) {
      variantStockCount = variant.stockCount;
    } else if (typeof variant === 'object' && variant.stock !== undefined && variant.stock !== null) {
      variantStockCount = variant.stock;
    } else {
      // Agar variant'da stok bo'lmasa, parent mahsulotning stokini olish
      variantStockCount = product.stockCount;
    }

    const variantProduct = {
      ...product,
      _id: `${product._id}_variant_${index}`,
      name: variantName,
      variantName: variantName,
      price: typeof variant === 'object' && variant.price ? variant.price : product.price,
      currency: typeof variant === 'object' && variant.currency ? variant.currency : product.currency,
      condition: typeof variant === 'object' && variant.condition ? variant.condition : product.condition,
      description: typeof variant === 'object' && variant.description ? variant.description : product.description,
      stockCount: variantStockCount, // Variantning stokini olish
      inStock: true, // Har doim true - client tarafida stockCount bo'yicha tekshiramiz
      // Variant rasmlarini qo'yamiz - agar bo'lsa, aks holda ota mahsulotning rasmini
      imageUrl: variantImages.length > 0 ? variantImages[0] : product.imageUrl,
      images: variantImages.length > 0 ? variantImages : product.images,
      imagePaths: variantImages.length > 0 ? variantImages : product.imagePaths,
      isVariant: true,
      variantIndex: index,
      parentProductId: product._id,
      // Store nomini variantlarga ham o'tkazish
      store: product.store,
      storeId: product.storeId || (product.store && typeof product.store === 'object' ? product.store._id : product.store),
    };

    expanded.push(variantProduct);
  });

  return expanded;
};

// Get all products
router.get("/", async (req, res) => {
  try {
    const { storeId, includeInactive, adminPanel, page = 1, limit = 30, categoryId, minPrice, maxPrice, expandVariants } = req.query;
    const userId = req.headers['x-user-id'];
    const filter = {};

    // Admin panel uchun maxsus filter
    if (adminPanel === 'true' && userId) {
      if (!includeInactive) {
        filter.inStock = true;
      }

      const User = (await import("../models/User.js")).default;
      const user = await User.findById(userId).lean();

      // Agar storeId berilgan bo'lsa - shu magazin mahsulotlarini ko'rsatish
      if (storeId) {
        // Magazinning postUserId va createdBy'sini olish
        const store = await Store.findById(storeId).select('postUserId createdBy').lean();

        if (store) {
          // store maydoni bo'lgan mahsulotlar YOKI postUserId/createdBy orqali qo'shilgan mahsulotlar
          const storeConditions = [{ store: storeId }];

          // postUserId bo'lsa - shu userId bilan qo'shilgan mahsulotlar (POST tizim/Excel import)
          if (store.postUserId) {
            storeConditions.push({ userId: store.postUserId });
          }

          // createdBy bo'lsa - shu user yaratgan mahsulotlar (store null bo'lsa)
          if (store.createdBy) {
            storeConditions.push({
              createdBy: store.createdBy,
              $or: [{ store: null }, { store: { $exists: false } }]
            });
            // userId ham createdBy bilan bir xil bo'lishi mumkin
            storeConditions.push({ userId: store.createdBy.toString() });
          }

          filter.$or = storeConditions;
          console.log('📦 Admin panel - storeId:', storeId, 'postUserId:', store.postUserId, 'createdBy:', store.createdBy, 'filter:', JSON.stringify(filter));
        } else {
          filter.store = storeId;
        }
      } else {
        // Admin o'zi yaratgan mahsulotlar + o'z magazinlaridagi barcha mahsulotlarni ko'radi
        if (user && user.role === 'admin') {
          // Admin'ning magazinlarini topish
          const adminStores = await Store.find({ createdBy: userId }).select('_id postUserId').lean();
          const adminStoreIds = adminStores.map(store => store._id);
          const adminPostUserIds = adminStores.filter(s => s.postUserId).map(s => s.postUserId);

          // O'zi yaratgan mahsulotlar YOKI o'z magazinlaridagi mahsulotlar YOKI POST tizimdan kelgan
          const conditions = [
            { createdBy: userId },
            { store: { $in: adminStoreIds } }
          ];

          if (adminPostUserIds.length > 0) {
            conditions.push({
              userId: { $in: adminPostUserIds },
              $or: [{ store: null }, { store: { $exists: false } }]
            });
          }

          filter.$or = conditions;
        }
        // Owner barcha mahsulotlarni ko'radi (filter bo'sh)
      }

      // Admin panel uchun paginatsiya yo'q - barcha mahsulotlar
      const products = await Product.find(filter)
        .populate('createdBy', 'name role')
        .populate('store', 'name color')
        .lean();
      
      // Kod/SKU bo'yicha RAQAMLI saralash - #1, #2, #3... tartibida
      products.sort((a, b) => {
        // Kod yoki SKU dan faqat raqamlarni olish (# belgisi va boshqa belgilarni olib tashlash)
        const getNum = (p) => {
          const str = String(p.code || p.sku || '999999');
          // Faqat raqamlarni olish, boshqa barcha belgilarni olib tashlash
          const numStr = str.replace(/\D/g, '');
          const num = parseInt(numStr, 10);
          return isNaN(num) ? 999999 : num;
        };
        
        const numA = getNum(a);
        const numB = getNum(b);
        
        const result = numA - numB;
        
        // Barcha solishtirishlar uchun log
        console.log(`🔢 Sort comparison: ${a.name} (${a.code || a.sku}) → ${numA} vs ${b.name} (${b.code || b.sku}) → ${numB} = ${result}`);
        
        return result;
      });
      
      console.log('✅ Admin Panel - Mahsulotlar kod bo\'yicha tartiblandi (#1, #2, #3...):', products.slice(0, 10).map(p => ({
        name: p.name,
        code: p.code,
        sku: p.sku,
        numericCode: parseInt(String(p.code || p.sku || '0').replace(/\D/g, ''), 10)
      })));

      return res.json(products);
    }

    // Bosh sahifa va boshqa sahifalar uchun - BARCHA ko'rinadigan mahsulotlar
    // isHidden: true bo'lmagan barcha mahsulotlar ko'rsatiladi

    // Kategoriya bo'yicha filter
    if (categoryId) {
      console.log('🔍 Starting category filter - categoryId:', categoryId);

      // Kategoriya va uning bolalarini topish - categories collection'dan
      const getAllChildIds = async (catId) => {
        try {
          const db = mongoose.connection.db;
          const categoriesCollection = db.collection('categories');

          const ids = [catId];
          const children = await categoriesCollection.find({ parentId: catId }).toArray();
          console.log(`  Found ${children.length} children for ${catId}`);
          for (const child of children) {
            const childIds = await getAllChildIds(child._id.toString());
            ids.push(...childIds);
          }
          return ids;
        } catch (err) {
          console.warn('Category fetch error:', err);
          return [catId];
        }
      };

      try {
        const categoryIds = await getAllChildIds(categoryId);
        console.log('📂 Category filter - categoryId:', categoryId, 'all IDs:', categoryIds);

        // FAQAT STRING FORMATDA - chunki mahsulotlarda categoryId string sifatida saqlangan
        const allCategoryIds = categoryIds.map(id => id.toString());

        console.log('📂 Category IDs (string only):', allCategoryIds.length, 'items');
        console.log('📂 Sample IDs:', allCategoryIds.slice(0, 4));

        // To'g'ridan-to'g'ri filter'ga qo'shamiz
        filter.categoryId = { $in: allCategoryIds };

        // Test: Shu categoryId bilan nechta mahsulot bor?
        const testCount = await Product.countDocuments({ categoryId: { $in: allCategoryIds } });
        console.log('📦 Products with this categoryId:', testCount);
      } catch (err) {
        console.warn('Category filter error:', err);
      }
    }

    // isHidden filter va categoryId filter - ikkalasini $and bilan birlashtirish
    const conditions = [];

    // isHidden filter
    conditions.push({
      $or: [
        { isHidden: { $ne: true } },
        { isHidden: { $exists: false } }
      ]
    });

    // categoryId filter (agar mavjud bo'lsa)
    if (filter.categoryId) {
      conditions.push({ categoryId: filter.categoryId });
      delete filter.categoryId;
    }

    // Agar conditions bo'lsa, $and ga qo'shamiz
    if (conditions.length > 0) {
      filter.$and = conditions;
    }

    console.log('📂 Final filter:', JSON.stringify(filter, null, 2));

    // Narx bo'yicha filter
    if (minPrice || maxPrice) {
      // price string sifatida saqlangan, shuning uchun $expr ishlatamiz
      const priceConditions = [];
      if (minPrice) {
        priceConditions.push({ $gte: [{ $toDouble: "$price" }, Number(minPrice)] });
      }
      if (maxPrice) {
        priceConditions.push({ $lte: [{ $toDouble: "$price" }, Number(maxPrice)] });
      }
      if (priceConditions.length > 0) {
        filter.$expr = { $and: priceConditions };
      }
    }

    // Paginatsiya
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = parseInt(limit) || 30; // Limit cheklovini olib tashladik

    // Agar variantlar kengaytirilsa, boshqacha paginatsiya kerak
    if (expandVariants === 'true') {
      // Barcha mahsulotlarni olamiz va variantlarni kengaytiramiz
      // Keyin paginatsiya qilamiz
      const allProducts = await Product.find(filter)
        .populate('store', 'name color')
        .populate('createdBy', 'name role')
        .sort({ createdAt: -1 })
        .lean();

      // Agar store bo'sh bo'lsa, createdBy user'ning magazinini topish
      for (let product of allProducts) {
        // inStock har doim true bo'lishi kerak (eski ma'lumotlar uchun)
        if (product.inStock === undefined || product.inStock === false) {
          product.inStock = true;
        }

        // variantSummaries'dagi barcha variantlarning inStock ham true bo'lishi kerak
        if (Array.isArray(product.variantSummaries)) {
          product.variantSummaries = product.variantSummaries.map(v => ({
            ...v,
            inStock: true
          }));
        }

        if (!product.store && product.createdBy) {
          // createdBy user'ning magazinini topish
          const User = (await import("../models/User.js")).default;
          const user = await User.findById(product.createdBy._id).select('store').lean();
          if (user && user.store) {
            const Store = (await import("../models/Store.js")).default;
            const store = await Store.findById(user.store).select('name color').lean();
            if (store) {
              product.store = store;
            }
          }
        }
      }

      // Variantlarni kengaytirish - LEKIN isVariant: true bo'lgan mahsulotlarni o'tkazib yuborish
      const expandedProducts = allProducts
        .filter(p => !p.isVariant) // Alohida saqlangan variantlarni o'tkazib yuborish
        .flatMap(expandProductVariants);
      const totalExpanded = expandedProducts.length;

      // Paginatsiya
      const skip = (pageNum - 1) * limitNum;
      const paginatedProducts = expandedProducts.slice(skip, skip + limitNum);

      return res.json({
        products: paginatedProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalExpanded,
          pages: Math.ceil(totalExpanded / limitNum),
          hasMore: skip + paginatedProducts.length < totalExpanded
        }
      });
    }

    // Oddiy paginatsiya (variantlarsiz)
    // isVariant: true bo'lgan mahsulotlarni o'tkazib yuborish
    const finalFilter = {
      ...filter,
      $and: [
        ...(filter.$and || []),
        { $or: [{ isVariant: { $ne: true } }, { isVariant: { $exists: false } }] }
      ]
    };

    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(finalFilter)
      .populate('store', 'name color')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Agar store bo'sh bo'lsa, createdBy user'ning magazinini topish
    for (let product of products) {
      console.log('🔍 Product:', product.name, 'store:', product.store, 'createdBy:', product.createdBy);

      // Normalize stock fields
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

      const maxStock = stockValues.length > 0 ? Math.max(...stockValues) : 0;

      product.stockCount = maxStock;
      product.stockQuantity = maxStock;

      // Smart inStock logic
      if (maxStock > 0) {
        product.inStock = true;
      } else if (maxStock === 0) {
        product.inStock = false;
      } else {
        if (product.inStock === undefined) {
          product.inStock = true;
        }
      }

      // variantSummaries'dagi barcha variantlarning inStock va stockCount'ini tekshirish
      if (Array.isArray(product.variantSummaries)) {
        product.variantSummaries = product.variantSummaries.map(v => {
          const vStockValues = [
            v.stockCount,
            v.stock,
            v.quantity,
            v.qty
          ].filter(val => val !== undefined && val !== null && !isNaN(val));

          const vMaxStock = vStockValues.length > 0 ? Math.max(...vStockValues) : 0;

          return {
            ...v,
            stockCount: vMaxStock,
            inStock: vMaxStock > 0
          };
        });
      }

      if (!product.store && product.createdBy) {
        // createdBy user'ning magazinini topish
        const User = (await import("../models/User.js")).default;
        const user = await User.findById(product.createdBy._id).select('store').lean();
        console.log('👤 User:', user?.name, 'store:', user?.store);
        if (user && user.store) {
          const Store = (await import("../models/Store.js")).default;
          const store = await Store.findById(user.store).select('name color').lean();
          console.log('🏪 Store found:', store?.name);
          if (store) {
            product.store = store;
          }
        }
      }
    }

    const total = await Product.countDocuments(finalFilter);

    // Cache headers - stale data muammosini hal qilish
    res.set({
      'Cache-Control': 'public, max-age=10, must-revalidate', // 10 sekund cache, keyin revalidate
      'ETag': `"products-${Date.now()}"`, // ETag - client cache'ni tekshirish uchun
    });

    res.json({
      products: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasMore: skip + products.length < total
      }
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    // MongoDB ulanmasa ham empty array qaytarish
    res.json({
      products: [],
      pagination: {
        page: 1,
        limit: 30,
        total: 0,
        pages: 0,
        hasMore: false
      }
    });
  }
});

// JSON-based creation (no multipart). Expects { images: string[], imageUrl?: string, ... }
router.post("/json", auth, async (req, res) => {
  try {
    const payload = { ...req.body };
    const userId = req.user.id;

    // Managers/helpers: must target their own store; helpers need products permission
    if (req.user.role === 'manager' || req.user.role === 'helper') {
      const targetStore = payload.store;
      if (!targetStore) {
        return res.status(400).json({ error: "Magazin majburiy" });
      }
      if (!req.user.managerOfShop || req.user.managerOfShop !== String(targetStore)) {
        return res.status(403).json({ error: "Faqat o'zingizning magaziningiz uchun mahsulot qo'shishingiz mumkin" });
      }
      if (req.user.role === 'helper' && !req.user.helperPermissions?.products) {
        return res.status(403).json({ error: "Mahsulotlar bo'limiga ruxsat yo'q" });
      }
    }

    const images = Array.isArray(payload.images) ? payload.images.filter(Boolean) : [];
    const primary = payload.imageUrl || images[0] || null;

    const stockCountValue = payload.stockCount ?? 0;
    const parsedStockCount = Number(stockCountValue);
    if (!Number.isFinite(parsedStockCount) || parsedStockCount < 0) {
      return res.status(400).json({ error: "Mahsulot soni noto'g'ri" });
    }

    // Normalize variants array if sent as JSON string
    let variants = [];
    if (payload.variants) {
      if (typeof payload.variants === "string") {
        try {
          variants = JSON.parse(payload.variants);
        } catch {
          variants = [];
        }
      } else if (Array.isArray(payload.variants)) {
        variants = payload.variants;
      }

      // Normalize stockCount for each variant
      variants = variants.map(variant => {
        if (typeof variant === 'object' && variant !== null) {
          const normalized = { ...variant };
          // Ensure stockCount is a number or null
          if (normalized.stockCount !== undefined && normalized.stockCount !== null) {
            const stockCount = Number(normalized.stockCount);
            normalized.stockCount = Number.isFinite(stockCount) && stockCount >= 0 ? stockCount : null;
          } else {
            normalized.stockCount = null;
          }
          return normalized;
        }
        return variant;
      });
    }

    // Manager uchun userId ni aniqlash - magazin egasining ID'si
    let productUserId = payload.userId || null;
    if (!productUserId && payload.store) {
      const Store = (await import("../models/Store.js")).default;
      const store = await Store.findById(payload.store);
      if (store && store.createdBy) {
        productUserId = store.createdBy.toString();
      }
    }

    // variantSummaries - POST tizim uchun format
    const variantSummaries = variants.map((v, idx) => ({
      name: v.name,
      sku: v.sku || `${payload.sku || ''}-${idx + 1}`,
      price: v.price,
      originalPrice: v.originalPrice,
      markupPercent: v.markupPercent,
      currency: v.currency || payload.currency || "USD",
      condition: v.condition || "new",
      stockCount: v.stockCount,
      inStock: true, // Har doim true - client tarafida stockCount bo'yicha tekshiramiz
      imageUrl: v.imageUrl || v.images?.[0],
      images: v.images || [],
      imagePaths: v.images || [],
    }));

    const productData = {
      name: payload.name?.trim(),
      price: payload.price,
      originalPrice: payload.originalPrice || null,
      markupPercent: payload.markupPercent ? Number(payload.markupPercent) : null,
      currency: payload.currency || "USD",
      condition: payload.condition || "new",
      description: payload.description,
      specifications: payload.specifications,
      categoryId: payload.categoryId || null,
      category: payload.category,
      store: payload.store || null,
      stockCount: parsedStockCount,
      inStock: true, // Har doim true - client tarafida stockCount bo'yicha tekshiramiz
      sku: payload.sku?.trim() || null,
      imageUrl: primary || null,
      images: images.length ? images : primary ? [primary] : [],
      variants: variants,
      variantSummaries: variantSummaries, // POST tizim uchun
      createdBy: userId, // Kim yaratganini saqlash
      userId: productUserId, // POST sayt uchun - magazin egasining ID'si
    };

    const product = await Product.create(productData);

    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product (json):", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// Get product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Normalize stock fields
    // Find the maximum value among all possible stock fields
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

    const maxStock = stockValues.length > 0 ? Math.max(...stockValues) : 0;

    // Update the product object with the normalized stock count
    product.stockCount = maxStock;
    // Also provide 'stockQuantity' as an alias for frontend convenience
    product.stockQuantity = maxStock;

    // Smart inStock logic
    if (maxStock > 0) {
      product.inStock = true;
    } else if (maxStock === 0) {
      product.inStock = false;
    } else {
      // Fallback for legacy data if no stock info exists at all
      if (product.inStock === undefined) {
        product.inStock = true;
      }
    }

    // variantSummaries'dagi barcha variantlarning inStock va stockCount'ini tekshirish
    if (Array.isArray(product.variantSummaries)) {
      product.variantSummaries = product.variantSummaries.map(v => {
        const vStockValues = [
          v.stockCount,
          v.stock,
          v.quantity,
          v.qty
        ].filter(val => val !== undefined && val !== null && !isNaN(val));

        const vMaxStock = vStockValues.length > 0 ? Math.max(...vStockValues) : 0;

        return {
          ...v,
          stockCount: vMaxStock,
          inStock: vMaxStock > 0
        };
      });
    }

    // Debug log - mahsulot ma'lumotlarini ko'rsatish
    console.log('📦 Product fetched (Normalized):', {
      id: product._id,
      name: product.name,
      stockCount: product.stockCount,
      inStock: product.inStock,
      originalStockValues: stockValues
    });

    // Cache headers - stale data muammosini hal qilish
    res.set({
      'Cache-Control': 'public, max-age=10, must-revalidate', // 10 sekund cache, keyin revalidate
      'ETag': `"product-${product._id}-${Date.now()}"`, // ETag - client cache'ni tekshirish uchun
    });

    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// Create new product
router.post("/", auth, (req, res) => {
  uploadSingleImage(req, res, async (uploadError) => {
    if (uploadError) {
      console.error("Product image upload error:", uploadError);
      return res
        .status(400)
        .json({ error: uploadError.message || "Rasm yuklashda xatolik" });
    }

    try {
      const payload = { ...req.body };
      const userId = req.user.id;

      // Managers/helpers: must target their own store; helpers need products permission
      if (req.user.role === 'manager' || req.user.role === 'helper') {
        const targetStore = payload.store;
        if (!targetStore) {
          return res.status(400).json({ error: "Magazin majburiy" });
        }
        if (!req.user.managerOfShop || req.user.managerOfShop !== String(targetStore)) {
          return res.status(403).json({ error: "Faqat o'zingizning magaziningiz uchun mahsulot qo'shishingiz mumkin" });
        }
        if (req.user.role === 'helper' && !req.user.helperPermissions?.products) {
          return res.status(403).json({ error: "Mahsulotlar bo'limiga ruxsat yo'q" });
        }
      }

      // Normalize images array if sent as JSON string
      if (typeof payload.images === "string") {
        try {
          payload.images = JSON.parse(payload.images);
        } catch {
          payload.images = [];
        }
      }

      // Normalize variants array if sent as JSON string
      let variants = [];
      if (payload.variants) {
        if (typeof payload.variants === "string") {
          try {
            variants = JSON.parse(payload.variants);
          } catch {
            variants = [];
          }
        } else if (Array.isArray(payload.variants)) {
          variants = payload.variants;
        }

        // Normalize stockCount for each variant
        variants = variants.map(variant => {
          if (typeof variant === 'object' && variant !== null) {
            const normalized = { ...variant };
            // Ensure stockCount is a number or null
            if (normalized.stockCount !== undefined && normalized.stockCount !== null) {
              const stockCount = Number(normalized.stockCount);
              normalized.stockCount = Number.isFinite(stockCount) && stockCount >= 0 ? stockCount : null;
            } else {
              normalized.stockCount = null;
            }
            return normalized;
          }
          return variant;
        });
      }

      // Rasm ixtiyoriy - agar yo'q bo'lsa null qilib qo'yamiz

      const stockCountValue = payload.stockCount ?? 0;
      const parsedStockCount = Number(stockCountValue);
      if (!Number.isFinite(parsedStockCount) || parsedStockCount < 0) {
        return res.status(400).json({ error: "Mahsulot soni noto'g'ri" });
      }
      payload.stockCount = parsedStockCount;
      payload.inStock = true; // Har doim true - client tarafida stockCount bo'yicha tekshiramiz

      if (payload.store) {
        const storeExists = await Store.exists({ _id: payload.store });
        if (!storeExists) {
          return res
            .status(400)
            .json({ error: "Berilgan magazin topilmadi" });
        }
      }

      // Kim nomidan qo'shilayotganini aniqlash
      const finalCreatedBy = payload.createdByUserId || userId;

      // Admin owner nomidan qo'sha olmaydi
      const User = (await import("../models/User.js")).default;
      const currentUser = await User.findById(userId);
      const targetUser = await User.findById(finalCreatedBy);

      if (currentUser && currentUser.role === 'admin' && targetUser && targetUser.role === 'owner') {
        return res.status(403).json({ error: "Admin owner nomidan mahsulot qo'sha olmaydi" });
      }

      let imageUrl = payload.imageUrl;
      if (req.file) {
        const uploadDir = req.app.locals.uploadDir || path.resolve(process.cwd(), "uploads");
        const uploadInfo = await processAndStoreImage(
          req.file.buffer,
          req.file.originalname,
          uploadDir,
        );
        imageUrl = uploadInfo.url;
      }

      // Manager uchun userId ni aniqlash - magazin egasining ID'si
      let productUserId = payload.userId || null;
      if (!productUserId && payload.store) {
        const Store = (await import("../models/Store.js")).default;
        const store = await Store.findById(payload.store);
        if (store && store.createdBy) {
          productUserId = store.createdBy.toString();
        }
      }

      // Debug log
      console.log("=== PRODUCT CREATE (multipart) ===");
      console.log("Full payload:", JSON.stringify(payload, null, 2));
      console.log("originalPrice:", payload.originalPrice, "type:", typeof payload.originalPrice);
      console.log("markupPercent:", payload.markupPercent, "type:", typeof payload.markupPercent);
      console.log("currency:", payload.currency);
      console.log("condition:", payload.condition);

      // variantSummaries - POST tizim uchun format
      const variantSummaries = variants.map((v, idx) => ({
        name: v.name,
        sku: v.sku || `${payload.sku || ''}-${idx + 1}`,
        price: v.price,
        originalPrice: v.originalPrice,
        markupPercent: v.markupPercent,
        currency: v.currency || payload.currency || "USD",
        condition: v.condition || "new",
        stockCount: v.stockCount,
        inStock: true, // Har doim true - client tarafida stockCount bo'yicha tekshiramiz
        imageUrl: v.imageUrl || v.images?.[0],
        images: v.images || [],
        imagePaths: v.images || [],
      }));

      const productData = {
        name: payload.name?.trim(),
        price: payload.price,
        originalPrice: payload.originalPrice || null,
        markupPercent: payload.markupPercent ? Number(payload.markupPercent) : null,
        currency: payload.currency || "USD",
        condition: payload.condition || "new",
        description: payload.description,
        specifications: payload.specifications,
        categoryId: payload.categoryId || null,
        category: payload.category,
        store: payload.store || null,
        stockCount: payload.stockCount,
        inStock: payload.inStock,
        sku: payload.sku?.trim() || null,
        imageUrl: imageUrl || null,
        images: (() => {
          // payload.images JSON string sifatida keladi, parse qilamiz
          if (typeof payload.images === 'string') {
            try {
              const parsed = JSON.parse(payload.images);
              return Array.isArray(parsed) ? parsed.filter(Boolean) : imageUrl ? [imageUrl] : [];
            } catch (e) {
              return imageUrl ? [imageUrl] : [];
            }
          }
          return Array.isArray(payload.images) ? payload.images.filter(Boolean) : imageUrl ? [imageUrl] : [];
        })(),
        variants: variants,
        variantSummaries: variantSummaries, // POST tizim uchun
        createdBy: finalCreatedBy, // Tanlangan foydalanuvchi nomidan
        userId: productUserId, // POST sayt uchun - magazin egasining ID'si
      };

      console.log("Product data to save:", JSON.stringify(productData, null, 2));

      const product = await Product.create(productData);

      console.log("=== PRODUCT CREATED ===");
      console.log("Saved product:", JSON.stringify(product.toObject(), null, 2));
      console.log("Variants count:", variants?.length || 0);

      // Variantlar asosiy mahsulotning variants array'ida saqlanadi
      // POST tizim variants array'ni o'qib, ichida ko'rsatishi kerak

      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });
});

// Update product
router.put("/:id", auth, (req, res) => {
  uploadSingleImage(req, res, async (uploadError) => {
    if (uploadError) {
      console.error("Product image upload error:", uploadError);
      return res
        .status(400)
        .json({ error: uploadError.message || "Rasm yuklashda xatolik" });
    }

    try {
      const updates = { ...req.body };
      const userId = req.user.id;

      console.log("=== PUT ENDPOINT ===");
      console.log("req.body keys:", Object.keys(req.body));
      console.log("req.body:", JSON.stringify(req.body, (key, value) => {
        if (key === 'imageUrl' && typeof value === 'string' && value.startsWith('data:image')) {
          return `[base64 image, length: ${value.length}]`;
        }
        return value;
      }, 2));
      console.log("req.file:", req.file ? "exists" : "null");

      // Mahsulotni topish
      const existingProduct = await Product.findById(req.params.id);
      if (!existingProduct) {
        return res.status(404).json({ error: "Mahsulot topilmadi" });
      }

      // POST tizim mahsulotlarini aniqlash (userId maydoni bor)
      const isPostSystemProduct = existingProduct.userId && existingProduct.userId !== null;

      // Images massivini req.body dan olish (barcha mahsulotlar uchun)
      if (typeof updates.images === "string") {
        try {
          updates.images = JSON.parse(updates.images);
        } catch {
          updates.images = [];
        }
      } else if (!Array.isArray(updates.images)) {
        updates.images = [];
      }

      console.log("=== IMAGES PROCESSING ===");
      console.log("updates.images:", updates.images);
      console.log("updates.images length:", updates.images?.length || 0);

      // POST tizim mahsulotlari uchun - faqat rasm va tasnif o'zgartiriladi
      if (isPostSystemProduct) {
        const filteredUpdates = {};
        if (updates.category !== undefined) filteredUpdates.category = updates.category;

        // Images ni qo'shish
        if (updates.images && Array.isArray(updates.images)) {
          filteredUpdates.images = updates.images;
          // Agar images bo'sh bo'lsa, imageUrl ham bo'sh bo'lishi kerak
          filteredUpdates.imageUrl = updates.images.length > 0 ? updates.images[0] : "";
        } else if (updates.imageUrl) {
          filteredUpdates.imageUrl = updates.imageUrl;
        }

        console.log("=== POST PRODUCT UPDATE ===");
        console.log("Full updates object:", JSON.stringify(updates, null, 2));
        console.log("req.file:", req.file ? "exists" : "null");
        console.log("updates.imageUrl:", updates.imageUrl ? "exists" : "null");
        console.log("updates.imageUrl type:", typeof updates.imageUrl);
        console.log("updates.imageUrl length:", typeof updates.imageUrl === 'string' ? updates.imageUrl.length : 'N/A');
        console.log("updates.imageUrl starts with data:image:", updates.imageUrl && typeof updates.imageUrl === 'string' ? updates.imageUrl.startsWith('data:image') : false);
        console.log("updates.variants:", updates.variants ? "exists" : "null");
        console.log("filteredUpdates.images:", filteredUpdates.images);
        console.log("filteredUpdates.imageUrl:", filteredUpdates.imageUrl);

        const uploadDir = req.app.locals.uploadDir;
        console.log("uploadDir:", uploadDir);

        // Normalize variants if sent as JSON string
        if (updates.variants !== undefined) {
          if (typeof updates.variants === "string") {
            try {
              updates.variants = JSON.parse(updates.variants);
            } catch {
              updates.variants = [];
            }
          } else if (!Array.isArray(updates.variants)) {
            updates.variants = [];
          }
        }

        // Rasm yuklangan bo'lsa (file orqali)
        if (req.file) {
          console.log("Processing file upload...");
          const uploadInfo = await processAndStoreImage(
            req.file.buffer,
            req.file.originalname,
            uploadDir,
          );
          console.log("File upload result:", uploadInfo);
          filteredUpdates.imageUrl = uploadInfo.url;
        }
        // Rasm base64 string bo'lsa
        else if (updates.imageUrl && typeof updates.imageUrl === 'string' && updates.imageUrl.startsWith('data:image')) {
          console.log("Processing base64 image...");
          try {
            console.log("Calling processAndStoreImage with uploadDir:", uploadDir);
            const uploadInfo = await processAndStoreImage(
              updates.imageUrl,
              'image.jpg',
              uploadDir,
            );
            console.log("Base64 upload result:", uploadInfo);
            if (uploadInfo) {
              filteredUpdates.imageUrl = uploadInfo.url;
              console.log("Image URL set to:", uploadInfo.url);
            } else {
              console.log("WARNING: uploadInfo is null");
            }
          } catch (err) {
            console.error("ERROR processing base64 image:", err.message);
            console.error("Stack:", err.stack);
          }
        }
        // Agar imageUrl URL bo'lsa yoki images array yuborilgan bo'lsa — to'g'ridan-to'g'ri saqlash
        else if (
          updates.imageUrl &&
          typeof updates.imageUrl === "string" &&
          (updates.imageUrl.startsWith("http") ||
            updates.imageUrl.startsWith("/api/") ||
            updates.imageUrl.startsWith("/uploads/"))
        ) {
          console.log("Using provided imageUrl (already uploaded):", updates.imageUrl);
          filteredUpdates.imageUrl = updates.imageUrl;
        } else if (Array.isArray(updates.images) && updates.images.length > 0) {
          console.log("Using first image from images array");
          filteredUpdates.imageUrl = updates.images[0];
        } else {
          console.log("No image to process");
        }

        // Variantlarni tekshirish va ularning rasmlari bo'lsa saqlash
        if (updates.variants && Array.isArray(updates.variants)) {
          console.log("Processing variants...");
          const processedVariants = [];

          for (let i = 0; i < updates.variants.length; i++) {
            const variant = updates.variants[i];
            const processedVariant = { ...variant };

            // Agar variant rasmi base64 bo'lsa, saqlash
            if (variant && typeof variant === 'object' && variant.imageUrl && typeof variant.imageUrl === 'string' && variant.imageUrl.startsWith('data:image')) {
              console.log(`Processing variant ${i} image...`);
              try {
                const uploadInfo = await processAndStoreImage(
                  variant.imageUrl,
                  `variant-${i}.jpg`,
                  uploadDir,
                );
                console.log(`Variant ${i} image upload result:`, uploadInfo);
                processedVariant.imageUrl = uploadInfo.url;
              } catch (err) {
                console.error(`Error processing variant ${i} image:`, err);
              }
            }

            processedVariants.push(processedVariant);
          }

          filteredUpdates.variants = processedVariants;
          filteredUpdates.variantSummaries = processedVariants.map((v, idx) => ({
            name: v.name,
            sku: v.sku || `${existingProduct.sku || ''}-${idx + 1}`,
            price: v.price,
            originalPrice: v.originalPrice,
            markupPercent: v.markupPercent,
            currency: v.currency || "USD",
            condition: v.condition || "new",
            stockCount: v.stockCount,
            inStock: true, // Har doim true - client tarafida stockCount bo'yicha tekshiramiz
            imageUrl: v.imageUrl,
            images: v.images || [],
            imagePaths: v.imagePaths || [],
          }));
        }

        console.log("Filtered updates:", filteredUpdates);
        const product = await Product.findByIdAndUpdate(
          req.params.id,
          filteredUpdates,
          { new: true, runValidators: true },
        );
        console.log("Updated product from DB:", {
          _id: product._id,
          imageUrl: product.imageUrl,
          category: product.category,
          variants: product.variants ? product.variants.length : 0,
          variantSummaries: product.variantSummaries ? product.variantSummaries.length : 0,
        });
        return res.json(product);
      }

      // User rolini tekshirish
      const User = (await import("../models/User.js")).default;
      const user = await User.findById(userId);

      // Managers/helpers: must target their own store; helpers need products permission
      if (user && (user.role === 'manager' || user.role === 'helper')) {
        const userStoreId = user.managerOfShop ? String(user.managerOfShop) : null;
        const productStoreId = existingProduct.store ? String(existingProduct.store) : null;

        if (productStoreId && userStoreId && productStoreId !== userStoreId) {
          return res.status(403).json({ error: "Faqat o'zingizning magaziningizdagi mahsulotni o'zgartira olasiz" });
        }
        if (user.role === 'helper' && !user.helperPermissions?.products) {
          return res.status(403).json({ error: "Mahsulotlar bo'limiga ruxsat yo'q" });
        }
      }

      // Admin o'zi yaratgan mahsulot YOKI o'z magazinidagi mahsulotni o'zgartira oladi
      if (user && user.role === 'admin') {
        const isOwnProduct = existingProduct.createdBy && existingProduct.createdBy.toString() === userId;

        // Agar o'zi yaratgan mahsulot bo'lmasa, magazinni tekshirish
        if (!isOwnProduct && existingProduct.store) {
          const productStore = await Store.findById(existingProduct.store);
          const isOwnStore = productStore && productStore.createdBy && productStore.createdBy.toString() === userId;

          if (!isOwnStore) {
            return res.status(403).json({ error: "Siz faqat o'zingiz yaratgan yoki o'z magaziningizdagi mahsulotni o'zgartira olasiz" });
          }
        } else if (!isOwnProduct) {
          // Mahsulot magazinga tegishli emas va o'zi yaratmagan
          return res.status(403).json({ error: "Siz faqat o'zingiz yaratgan mahsulotni o'zgartira olasiz" });
        }
      }

      // Normalize variants array if sent as JSON string
      if (updates.variants !== undefined) {
        if (typeof updates.variants === "string") {
          try {
            updates.variants = JSON.parse(updates.variants);
          } catch {
            updates.variants = [];
          }
        } else if (!Array.isArray(updates.variants)) {
          updates.variants = [];
        }

        // Normalize stockCount for each variant
        if (Array.isArray(updates.variants)) {
          updates.variants = updates.variants.map(variant => {
            if (typeof variant === 'object' && variant !== null) {
              const normalized = { ...variant };
              // Ensure stockCount is a number or null
              if (normalized.stockCount !== undefined && normalized.stockCount !== null) {
                const stockCount = Number(normalized.stockCount);
                normalized.stockCount = Number.isFinite(stockCount) && stockCount >= 0 ? stockCount : null;
              } else {
                normalized.stockCount = null;
              }
              return normalized;
            }
            return variant;
          });

          // variantSummaries - POST tizim uchun format (update qilganda ham yangilanadi)
          const productSku = updates.sku || existingProduct.sku || '';
          updates.variantSummaries = updates.variants.map((v, idx) => ({
            name: v.name,
            sku: v.sku || `${productSku}-${idx + 1}`,
            originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
            markupPercent: v.markupPercent ? Number(v.markupPercent) : null,
            price: v.price ? Number(v.price) : null,
            currency: v.currency || 'USD',
            condition: v.condition || 'new',
            stockCount: v.stockCount !== undefined && v.stockCount !== null ? Number(v.stockCount) : null,
            inStock: true, // Har doim true - client tarafida stockCount bo'yicha tekshiramiz
            imageUrl: v.imageUrl || (Array.isArray(v.images) && v.images[0]) || null,
            images: Array.isArray(v.images) ? v.images.filter(Boolean) : v.imageUrl ? [v.imageUrl] : [],
          }));
        }
      }

      if (updates.stockCount !== undefined) {
        const parsedStockCount = Number(updates.stockCount);
        if (!Number.isFinite(parsedStockCount) || parsedStockCount < 0) {
          return res.status(400).json({ error: "Mahsulot soni noto'g'ri" });
        }
        updates.stockCount = parsedStockCount;
        updates.inStock = true; // Har doim true - client tarafida stockCount bo'yicha tekshiramiz
      }

      if (updates.sku !== undefined) {
        updates.sku = updates.sku?.trim() || null;
      }

      if (updates.store) {
        const storeExists = await Store.exists({ _id: updates.store });
        if (!storeExists) {
          return res
            .status(400)
            .json({ error: "Berilgan magazin topilmadi" });
        }
      }

      if (req.file) {
        const uploadDir = req.app.locals.uploadDir || path.resolve(process.cwd(), "uploads");
        const uploadInfo = await processAndStoreImage(
          req.file.buffer,
          req.file.originalname,
          uploadDir,
        );
        // Remove previous image from disk
        await removeImageByUrl(existingProduct.imageUrl, uploadDir);
        updates.imageUrl = uploadInfo.url;

        // Agar images massivi yuborilgan bo'lsa, yangi rasmni boshiga qo'shamiz
        if (updates.images && Array.isArray(updates.images)) {
          updates.images = [uploadInfo.url, ...updates.images.filter(img => img !== uploadInfo.url)];
        }
      } else if (updates.images && updates.images.length) {
        updates.imageUrl = updates.images[0];
      }

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true },
      );
      if (!product) {
        return res.status(404).json({ error: "Mahsulot topilmadi" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Mahsulotni yangilashda xatolik yuz berdi" });
    }
  });
});

// Delete product
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Mahsulotni topish
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Mahsulot topilmadi" });
    }

    // User rolini tekshirish
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId);

    // Managers/helpers: must target their own store; helpers need products permission
    if (user && (user.role === 'manager' || user.role === 'helper')) {
      const userStoreId = user.managerOfShop ? String(user.managerOfShop) : null;
      const productStoreId = product.store ? String(product.store) : null;

      if (productStoreId && userStoreId && productStoreId !== userStoreId) {
        return res.status(403).json({ error: "Faqat o'zingizning magaziningizdagi mahsulotni o'chira olasiz" });
      }
      if (user.role === 'helper' && !user.helperPermissions?.products) {
        return res.status(403).json({ error: "Mahsulotlar bo'limiga ruxsat yo'q" });
      }
    }

    // Admin o'zi yaratgan mahsulot YOKI o'z magazinidagi mahsulotni o'chira oladi
    if (user && user.role === 'admin') {
      const isOwnProduct = product.createdBy && product.createdBy.toString() === userId;

      // Agar o'zi yaratgan mahsulot bo'lmasa, magazinni tekshirish
      if (!isOwnProduct && product.store) {
        const productStore = await Store.findById(product.store);
        const isOwnStore = productStore && productStore.createdBy && productStore.createdBy.toString() === userId;

        if (!isOwnStore) {
          return res.status(403).json({ error: "Siz faqat o'zingiz yaratgan yoki o'z magaziningizdagi mahsulotni o'chira olasiz" });
        }
      } else if (!isOwnProduct) {
        // Mahsulot magazinga tegishli emas va o'zi yaratmagan
        return res.status(403).json({ error: "Siz faqat o'zingiz yaratgan mahsulotni o'chira olasiz" });
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    const uploadDir = req.app.locals.uploadDir;
    await removeImageByUrl(product.imageUrl, uploadDir);

    res.json({ message: "Mahsulot muvaffaqiyatli o'chirildi" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Mahsulotni o'chirishda xatolik yuz berdi" });
  }
});

export default router;
