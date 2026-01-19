import express from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import auth from '../middleware/auth.js';
import Store from '../models/Store.js';

const router = express.Router();

// Получение коллекции categories из avtofix
function getCollection() {
  // MongoDB ulanishini tekshirish
  if (!mongoose.connection.db) {
    throw new Error('MongoDB connection not ready');
  }
  const db = mongoose.connection.db;
  return db.collection('categories');
}

// Функция для получения storeId и userId пользователя
async function getUserStoreInfo(user) {
  if (!user) return null;
  
  // Owner yoki admin - birinchi magazinni olish
  if (user.role === 'owner' || user.role === 'admin') {
    const store = await Store.findOne({ createdBy: user.id }).select('_id');
    return {
      storeId: store ? store._id.toString() : null,
      userId: user.id // POST tizim uchun userId ham kerak
    };
  }
  
  // Manager, helper yoki xodim - biriktirilgan magazin
  if (user.managerOfShop) {
    // Magazin egasining userId'sini olish
    const store = await Store.findById(user.managerOfShop).select('createdBy');
    return {
      storeId: user.managerOfShop.toString(),
      userId: store ? store.createdBy.toString() : null
    };
  }
  
  return null;
}

// Kategoriyalar uchun filter yaratish (storeId YOKI userId bo'yicha)
function buildCategoryFilter(storeInfo) {
  if (!storeInfo) return null;
  
  const { ObjectId } = mongoose.Types;
  
  // storeId yoki userId bo'yicha qidirish (POST tizim userId ishlatadi)
  const conditions = [];
  
  if (storeInfo.storeId) {
    // storeId string yoki ObjectId bo'lishi mumkin
    conditions.push({ storeId: storeInfo.storeId });
    if (ObjectId.isValid(storeInfo.storeId)) {
      conditions.push({ storeId: new ObjectId(storeInfo.storeId) });
    }
  }
  
  if (storeInfo.userId) {
    // userId string yoki ObjectId bo'lishi mumkin
    conditions.push({ userId: storeInfo.userId });
    if (ObjectId.isValid(storeInfo.userId)) {
      conditions.push({ userId: new ObjectId(storeInfo.userId) });
    }
  }
  
  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0];
  
  return { $or: conditions };
}

// Построение дерева категорий
async function buildTree(storeInfo, parentId = null, level = 0) {
  const collection = getCollection();
  const baseFilter = buildCategoryFilter(storeInfo);
  
  if (!baseFilter) return [];
  
  // Для корневых: parentId null/undefined или level=0
  let filter;
  if (parentId === null) {
    // Root kategoriyalar uchun
    if (baseFilter.$or) {
      // $or mavjud bo'lsa, har bir shart uchun parentId shartini qo'shish
      filter = {
        $and: [
          baseFilter,
          {
            $or: [
              { parentId: null }, 
              { parentId: { $exists: false } },
              { level: 0 }
            ]
          }
        ]
      };
    } else {
      filter = { 
        ...baseFilter,
        $or: [
          { parentId: null }, 
          { parentId: { $exists: false } },
          { level: 0 }
        ]
      };
    }
  } else {
    // Ichki kategoriyalar uchun
    if (baseFilter.$or) {
      filter = {
        $and: [
          baseFilter,
          { parentId: parentId.toString() }
        ]
      };
    } else {
      filter = { ...baseFilter, parentId: parentId.toString() };
    }
  }
  
  const categories = await collection.find(filter).toArray();
  // Сортировка: новые вверху (по createdAt desc)
  categories.sort((a, b) => {
    const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
    const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
    return dateB - dateA;
  });
  
  const tree = [];
  for (const category of categories) {
    const node = {
      ...category,
      level,
      children: await buildTree(storeInfo, category._id, level + 1)
    };
    tree.push(node);
  }
  
  return tree;
}

// Получить всех потомков категории
async function getDescendants(storeInfo, categoryId) {
  const collection = getCollection();
  const baseFilter = buildCategoryFilter(storeInfo);
  const descendants = [];
  const queue = [categoryId.toString()];

  if (!baseFilter) return descendants;

  while (queue.length > 0) {
    const currentId = queue.shift();
    let filter;
    if (baseFilter.$or) {
      filter = {
        $and: [baseFilter, { parentId: currentId }]
      };
    } else {
      filter = { ...baseFilter, parentId: currentId };
    }
    
    const children = await collection.find(filter).toArray();
    
    for (const child of children) {
      descendants.push(child);
      queue.push(child._id.toString());
    }
  }

  return descendants;
}


// GET /api/categories/public - Public endpoint for header/catalog (no auth required)
router.get('/public', async (req, res) => {
  try {
    // MongoDB ulanishini tekshirish
    if (!mongoose.connection.db) {
      console.log('⏳ MongoDB connection not ready yet, returning empty array');
      return res.json([]);
    }
    
    const { parentId } = req.query;
    const collection = getCollection();
    
    let filter;
    const isRoot = !parentId || parentId === 'null' || parentId === '';
    
    if (isRoot) {
      filter = {
        $or: [
          { parentId: null }, 
          { parentId: { $exists: false } },
          { level: 0 }
        ]
      };
    } else {
      filter = { parentId: parentId };
    }
    
    const categories = await collection.find(filter).toArray();
    categories.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return dateB - dateA;
    });
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching public categories:', error);
    res.status(500).json({ error: 'Kategoriyalarni yuklashda xatolik' });
  }
});

// GET /api/categories/debug - Debug endpoint to see all categories
router.get('/debug', auth, async (req, res) => {
  try {
    const collection = getCollection();
    
    // Barcha kategoriyalarni olish (filtersiz)
    const allCategories = await collection.find({}).limit(20).toArray();
    
    // storeInfo ni aniqlash
    const storeInfo = await getUserStoreInfo(req.user);
    
    // Store ma'lumotlarini olish
    const { storeId: queryStoreId } = req.query;
    let storeData = null;
    if (queryStoreId) {
      storeData = await Store.findById(queryStoreId).select('createdBy name');
    }
    
    res.json({
      user: {
        id: req.user?.id,
        role: req.user?.role
      },
      storeInfo,
      queryStoreId,
      storeData: storeData ? {
        _id: storeData._id,
        name: storeData.name,
        createdBy: storeData.createdBy
      } : null,
      totalCategories: allCategories.length,
      sampleCategories: allCategories.map(c => ({
        _id: c._id,
        name: c.name,
        userId: c.userId,
        storeId: c.storeId,
        parentId: c.parentId
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/categories - Get categories
router.get('/', auth, async (req, res) => {
  try {
    const { flat, parentId, storeId: queryStoreId } = req.query;
    const collection = getCollection();
    
    // POST tizimdagi userId ni aniqlash
    let postUserId = null;
    
    if (queryStoreId) {
      // Query'dan storeId berilgan bo'lsa, magazinning postUserId'sini olish
      const store = await Store.findById(queryStoreId).select('postUserId');
      if (store && store.postUserId) {
        postUserId = store.postUserId;
      }
    }
    
    console.log('📂 Categories request - QueryStoreId:', queryStoreId, 'PostUserId:', postUserId);

    // Filter yaratish - agar postUserId bo'lmasa, barcha kategoriyalarni ko'rsatamiz
    let userFilter = {};
    if (postUserId) {
      userFilter = { userId: postUserId };
      console.log('📂 Filtering by userId:', postUserId);
    } else {
      console.log('📂 No postUserId found - showing all categories. Please set postUserId in store settings.');
    }

    // Mode 1: direct children of parent
    if (typeof parentId !== 'undefined') {
      const isRoot = parentId === 'null' || parentId === '';
      let filter;
      
      if (isRoot) {
        // Root kategoriyalar
        if (postUserId) {
          filter = {
            $and: [
              { userId: postUserId },
              {
                $or: [
                  { parentId: null }, 
                  { parentId: { $exists: false } },
                  { level: 0 }
                ]
              }
            ]
          };
        } else {
          filter = {
            $or: [
              { parentId: null }, 
              { parentId: { $exists: false } },
              { level: 0 }
            ]
          };
        }
      } else {
        if (postUserId) {
          filter = { userId: postUserId, parentId: parentId };
        } else {
          filter = { parentId: parentId };
        }
      }
      
      console.log('📂 Final filter:', JSON.stringify(filter));
      
      const categories = await collection.find(filter).toArray();
      console.log('📂 Found categories:', categories.length);
      
      // Сортировка: новые вверху
      categories.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return dateB - dateA;
      });
      return res.json(categories);
    }

    // Mode 2: flat list
    if (flat === 'true') {
      const categories = await collection.find(userFilter).toArray();
      categories.sort((a, b) => (a.level || 0) - (b.level || 0) || (a.order || 0) - (b.order || 0));
      return res.json(categories);
    }

    // Mode 3: hierarchical tree
    const categories = await collection.find(userFilter).toArray();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      error: 'Kategoriyalarni yuklashda xatolik',
      message: error.message 
    });
  }
});

// GET /api/categories/:id - Get single category
router.get('/:id', auth, async (req, res) => {
  try {
    const collection = getCollection();
    const { ObjectId } = mongoose.Types;
    let baseFilter = null;

    // storeInfo ni aniqlash (agar mavjud bo'lsa, shu bo'yicha filter; aks holda public fallback)
    const storeInfo = await getUserStoreInfo(req.user);
    if (storeInfo) {
      baseFilter = buildCategoryFilter(storeInfo);
    }

    let category;
    if (ObjectId.isValid(req.params.id)) {
      let filter;
      if (baseFilter && baseFilter.$or) {
        filter = {
          $and: [baseFilter, { _id: new ObjectId(req.params.id) }]
        };
      } else if (baseFilter) {
        filter = { ...baseFilter, _id: new ObjectId(req.params.id) };
      } else {
        // Agar storeInfo/topilgan filter bo'lmasa ham, kategoriyani public tarzda ID bo'yicha izlaymiz
        filter = { _id: new ObjectId(req.params.id) };
      }
      category = await collection.findOne(filter);
    }
    
    if (!category) {
      return res.status(404).json({ error: 'Kategoriya topilmadi' });
    }

    // Build path
    const pathParts = [category.name];
    let current = category;
    while (current.parentId) {
      let parentFilter;
      if (baseFilter && baseFilter.$or) {
        parentFilter = {
          $and: [
            baseFilter,
            { _id: ObjectId.isValid(current.parentId) ? new ObjectId(current.parentId) : null }
          ]
        };
      } else {
        parentFilter = {
          ...baseFilter,
          _id: ObjectId.isValid(current.parentId) ? new ObjectId(current.parentId) : null
        };
      }
      const parent = await collection.findOne(parentFilter);
      if (parent) {
        pathParts.unshift(parent.name);
        current = parent;
      } else {
        break;
      }
    }

    res.json({ ...category, path: pathParts.join(' > ') });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ 
      error: 'Kategoriyani yuklashda xatolik',
      message: error.message 
    });
  }
});


// POST /api/categories - Create new category
router.post('/', auth, async (req, res) => {
  try {
    const { name, parentId, description, icon, order, storeId: bodyStoreId } = req.body;
    const collection = getCollection();
    const { ObjectId } = mongoose.Types;
    
    // storeInfo ni aniqlash - body'dan yoki user'dan
    let storeInfo;
    if (bodyStoreId) {
      // Body'dan storeId berilgan bo'lsa, magazin egasini topish
      const store = await Store.findById(bodyStoreId).select('createdBy');
      if (store) {
        storeInfo = {
          storeId: bodyStoreId,
          userId: store.createdBy ? store.createdBy.toString() : null
        };
      }
    }
    
    // Agar body'dan topilmasa, user'dan olish
    if (!storeInfo) {
      storeInfo = await getUserStoreInfo(req.user);
    }
    
    if (!storeInfo) {
      return res.status(400).json({ error: 'Magazin topilmadi' });
    }
    
    const baseFilter = buildCategoryFilter(storeInfo);

    console.log('📝 Creating category:', { name, parentId, description, icon, order, storeInfo });

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Kategoriya nomi kiritilishi shart' });
    }

    // Calculate level
    let level = 0;
    if (parentId) {
      let parentFilter;
      if (baseFilter.$or) {
        parentFilter = {
          $and: [baseFilter, { _id: ObjectId.isValid(parentId) ? new ObjectId(parentId) : null }]
        };
      } else {
        parentFilter = {
          ...baseFilter,
          _id: ObjectId.isValid(parentId) ? new ObjectId(parentId) : null
        };
      }
      const parent = await collection.findOne(parentFilter);
      if (!parent) {
        return res.status(404).json({ error: 'Ota kategoriya topilmadi' });
      }
      level = (parent.level || 0) + 1;
    }

    // Get next order number if not provided
    let categoryOrder = order;
    if (categoryOrder === undefined || categoryOrder === null) {
      let orderFilter;
      if (baseFilter.$or) {
        orderFilter = {
          $and: [baseFilter, { parentId: parentId || null }]
        };
      } else {
        orderFilter = { ...baseFilter, parentId: parentId || null };
      }
      const maxOrderCat = await collection.find(orderFilter).sort({ order: -1 }).limit(1).toArray();
      categoryOrder = maxOrderCat.length > 0 ? (maxOrderCat[0].order || 0) + 1 : 0;
    }

    // Yangi kategoriya - storeId va userId ikkalasini ham saqlash (POST tizim bilan moslik uchun)
    const newCategory = {
      name: name.trim(),
      parentId: parentId || null,
      level,
      order: categoryOrder,
      description: description?.trim() || null,
      icon: icon?.trim() || null,
      isActive: true,
      storeId: storeInfo.storeId,
      userId: storeInfo.userId, // POST tizim uchun
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(newCategory);
    const created = { ...newCategory, _id: result.insertedId };
    
    console.log('✅ Category created successfully:', created);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ 
      error: 'Kategoriya yaratishda xatolik',
      message: error.message 
    });
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, parentId, description, icon, order, isActive } = req.body;
    const collection = getCollection();
    const { ObjectId } = mongoose.Types;
    
    // storeInfo ni aniqlash
    const storeInfo = await getUserStoreInfo(req.user);
    
    if (!storeInfo) {
      return res.status(400).json({ error: 'Magazin topilmadi' });
    }
    
    const baseFilter = buildCategoryFilter(storeInfo);

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Noto\'g\'ri kategoriya ID' });
    }

    let findFilter;
    if (baseFilter.$or) {
      findFilter = {
        $and: [baseFilter, { _id: new ObjectId(req.params.id) }]
      };
    } else {
      findFilter = { ...baseFilter, _id: new ObjectId(req.params.id) };
    }

    const category = await collection.findOne(findFilter);

    if (!category) {
      return res.status(404).json({ error: 'Kategoriya topilmadi' });
    }

    // Check circular reference
    if (parentId && parentId.toString() === req.params.id) {
      return res.status(400).json({ error: 'Kategoriya o\'zini ota kategoriya qila olmaydi' });
    }

    if (parentId) {
      const descendants = await getDescendants(storeInfo, req.params.id);
      if (descendants.some(d => d._id.toString() === parentId.toString())) {
        return res.status(400).json({ 
          error: 'Kategoriyaning ichki kategoriyasini ota kategoriya qilib bo\'lmaydi' 
        });
      }
    }

    const updateData = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (icon !== undefined) updateData.icon = icon?.trim() || null;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update parent and recalculate level
    if (parentId !== undefined && parentId !== category.parentId) {
      updateData.parentId = parentId || null;
      
      let newLevel = 0;
      if (parentId) {
        let parentFilter;
        if (baseFilter.$or) {
          parentFilter = {
            $and: [baseFilter, { _id: new ObjectId(parentId) }]
          };
        } else {
          parentFilter = { ...baseFilter, _id: new ObjectId(parentId) };
        }
        const parent = await collection.findOne(parentFilter);
        if (!parent) {
          return res.status(404).json({ error: 'Ota kategoriya topilmadi' });
        }
        newLevel = (parent.level || 0) + 1;
      }
      updateData.level = newLevel;
    }

    await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    const updated = await collection.findOne({ _id: new ObjectId(req.params.id) });
    res.json(updated);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ 
      error: 'Kategoriyani yangilashda xatolik',
      message: error.message 
    });
  }
});


// DELETE /api/categories/:id - Delete category
router.delete('/:id', auth, async (req, res) => {
  try {
    const collection = getCollection();
    const { ObjectId } = mongoose.Types;
    
    // storeInfo ni aniqlash
    const storeInfo = await getUserStoreInfo(req.user);
    
    if (!storeInfo) {
      return res.status(400).json({ error: 'Magazin topilmadi' });
    }
    
    const baseFilter = buildCategoryFilter(storeInfo);

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Noto\'g\'ri kategoriya ID' });
    }

    let findFilter;
    if (baseFilter && baseFilter.$or) {
      findFilter = {
        $and: [baseFilter, { _id: new ObjectId(req.params.id) }]
      };
    } else if (baseFilter) {
      findFilter = { ...baseFilter, _id: new ObjectId(req.params.id) };
    } else {
      // Agar baseFilter bo'lmasa ham, kategoriyani ID bo'yicha qidirish
      findFilter = { _id: new ObjectId(req.params.id) };
    }

    let category = await collection.findOne(findFilter);

    // Agar kategoriya topilmasa, boshqa filterlar bilan ham qidirishga harakat qilamiz
    if (!category) {
      // Faqat ID bo'yicha qidirishga harakat qilamiz
      category = await collection.findOne({ _id: new ObjectId(req.params.id) });
    }

    if (!category) {
      return res.status(404).json({ error: 'Kategoriya topilmadi' });
    }

    // Get all descendants
    const descendants = await getDescendants(storeInfo, req.params.id);
    const allIds = [new ObjectId(req.params.id), ...descendants.map(d => d._id)];
    
    console.log(`🗑️ Deleting category ${req.params.id} with ${descendants.length} descendants`);

    // Check if any category is used by products
    const productsCount = await Product.countDocuments({ 
      category: { $in: allIds.map(id => id.toString()) }
    });
    
    if (productsCount > 0) {
      return res.status(400).json({ 
        error: 'Bu kategoriyada yoki uning ichki kategoriyalarida mahsulotlar mavjud. Avval mahsulotlarni boshqa kategoriyaga o\'tkazing.',
        productsCount 
      });
    }

    // Delete category and all descendants
    await collection.deleteMany({ _id: { $in: allIds } });
    
    console.log(`✅ Deleted ${allIds.length} categories`);

    res.json({ 
      message: 'Kategoriya va barcha ichki kategoriyalar muvaffaqiyatli o\'chirildi',
      deletedId: req.params.id,
      deletedCount: allIds.length
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ 
      error: 'Kategoriyani o\'chirishda xatolik',
      message: error.message 
    });
  }
});

// POST /api/categories/reorder - Reorder categories
router.post('/reorder', auth, async (req, res) => {
  try {
    const { updates } = req.body;
    const collection = getCollection();
    const { ObjectId } = mongoose.Types;
    
    // storeInfo ni aniqlash
    const storeInfo = await getUserStoreInfo(req.user);
    
    if (!storeInfo) {
      return res.status(400).json({ error: 'Magazin topilmadi' });
    }
    
    const baseFilter = buildCategoryFilter(storeInfo);

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Yangilash ma\'lumotlari noto\'g\'ri' });
    }

    for (const { id, order, parentId } of updates) {
      if (!ObjectId.isValid(id)) continue;
      
      const updateData = { order, updatedAt: new Date() };
      if (parentId !== undefined) {
        updateData.parentId = parentId || null;
      }
      
      let updateFilter;
      if (baseFilter.$or) {
        updateFilter = {
          $and: [baseFilter, { _id: new ObjectId(id) }]
        };
      } else {
        updateFilter = { _id: new ObjectId(id), ...baseFilter };
      }
      
      await collection.updateOne(updateFilter, { $set: updateData });
    }

    const tree = await buildTree(storeInfo);
    res.json(tree);
  } catch (error) {
    console.error('Error reordering categories:', error);
    res.status(500).json({ 
      error: 'Kategoriyalarni qayta tartiblashda xatolik',
      message: error.message 
    });
  }
});

export default router;
