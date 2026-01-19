import express from 'express';
import ProfessionalCategory from '../models/ProfessionalCategory.js';

const router = express.Router();

// GET /api/professional-categories - Get categories
router.get('/', async (req, res) => {
  try {
    const { flat, parentId } = req.query;

    // Mode 1: direct children of parent
    if (typeof parentId !== 'undefined') {
      const isRoot = parentId === 'null' || parentId === '';
      const filter = isRoot
        ? { $or: [{ parentId: null }, { parentId: { $exists: false } }] }
        : { parentId: parentId };
      
      const categories = await ProfessionalCategory.find(filter)
        .sort({ order: 1, createdAt: -1 })
        .lean();
      return res.json(categories);
    }

    // Mode 2: flat list
    if (flat === 'true') {
      const categories = await ProfessionalCategory.find()
        .sort({ level: 1, order: 1 })
        .lean();
      return res.json(categories);
    }

    // Mode 3: hierarchical tree
    const tree = await ProfessionalCategory.buildTree();
    res.json(tree);
  } catch (error) {
    console.error('Error fetching professional categories:', error);
    // MongoDB ulanmasa ham empty array qaytarish
    res.json([]);
  }
});

// GET /api/professional-categories/:id - Get single category
router.get('/:id', async (req, res) => {
  try {
    const category = await ProfessionalCategory.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ error: 'Kategoriya topilmadi' });
    }

    const path = await category.getPath();
    res.json({ ...category.toObject(), path });
  } catch (error) {
    console.error('Error fetching professional category:', error);
    res.status(500).json({ 
      error: 'Kategoriyani yuklashda xatolik',
      message: error.message 
    });
  }
});

// POST /api/professional-categories - Create new category
router.post('/', async (req, res) => {
  try {
    const { name, parentId, description, order } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Kategoriya nomi kiritilishi shart' });
    }

    // Calculate level
    let level = 0;
    if (parentId) {
      const parent = await ProfessionalCategory.findById(parentId);
      if (!parent) {
        return res.status(404).json({ error: 'Ota kategoriya topilmadi' });
      }
      level = (parent.level || 0) + 1;
    }

    // Get next order number if not provided
    let categoryOrder = order;
    if (categoryOrder === undefined || categoryOrder === null) {
      const maxOrderCat = await ProfessionalCategory.findOne({ parentId: parentId || null })
        .sort({ order: -1 });
      categoryOrder = maxOrderCat ? (maxOrderCat.order || 0) + 1 : 0;
    }

    const newCategory = new ProfessionalCategory({
      name: name.trim(),
      parentId: parentId || null,
      level,
      order: categoryOrder,
      description: description?.trim() || null,
      isActive: true
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating professional category:', error);
    res.status(500).json({ 
      error: 'Kategoriya yaratishda xatolik',
      message: error.message 
    });
  }
});

// PUT /api/professional-categories/:id - Update category
router.put('/:id', async (req, res) => {
  try {
    const { name, parentId, description, order, isActive } = req.body;

    const category = await ProfessionalCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Kategoriya topilmadi' });
    }

    // Check circular reference
    if (parentId && parentId.toString() === req.params.id) {
      return res.status(400).json({ error: 'Kategoriya o\'zini ota kategoriya qila olmaydi' });
    }

    if (parentId) {
      const descendants = await ProfessionalCategory.getDescendants(req.params.id);
      if (descendants.some(d => d.toString() === parentId.toString())) {
        return res.status(400).json({ 
          error: 'Kategoriyaning ichki kategoriyasini ota kategoriya qilib bo\'lmaydi' 
        });
      }
    }

    if (name !== undefined) category.name = name.trim();
    if (description !== undefined) category.description = description?.trim() || null;
    if (order !== undefined) category.order = order;
    if (isActive !== undefined) category.isActive = isActive;

    // Update parent and recalculate level
    if (parentId !== undefined && parentId !== category.parentId?.toString()) {
      category.parentId = parentId || null;
      
      let newLevel = 0;
      if (parentId) {
        const parent = await ProfessionalCategory.findById(parentId);
        if (!parent) {
          return res.status(404).json({ error: 'Ota kategoriya topilmadi' });
        }
        newLevel = (parent.level || 0) + 1;
      }
      category.level = newLevel;
    }

    await category.save();
    res.json(category);
  } catch (error) {
    console.error('Error updating professional category:', error);
    res.status(500).json({ 
      error: 'Kategoriyani yangilashda xatolik',
      message: error.message 
    });
  }
});

// DELETE /api/professional-categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  try {
    const category = await ProfessionalCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Kategoriya topilmadi' });
    }

    // Get all descendants
    const descendants = await ProfessionalCategory.getDescendants(req.params.id);
    const allIds = [req.params.id, ...descendants];

    // Delete category and all descendants
    await ProfessionalCategory.deleteMany({ _id: { $in: allIds } });

    res.json({ 
      message: 'Kategoriya va barcha ichki kategoriyalar muvaffaqiyatli o\'chirildi',
      deletedId: req.params.id,
      deletedCount: allIds.length
    });
  } catch (error) {
    console.error('Error deleting professional category:', error);
    res.status(500).json({ 
      error: 'Kategoriyani o\'chirishda xatolik',
      message: error.message 
    });
  }
});

export default router;
