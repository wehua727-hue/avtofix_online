import express from 'express';
import auth, { requireManager } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// List helpers for manager's shop (or helper with helpers permission)
router.get('/helpers', auth, async (req, res) => {
  // Проверяем, что это менеджер или помощник с разрешением на помощников
  if (req.user.role !== 'manager' && (req.user.role !== 'helper' || !req.user.helperPermissions?.helpers)) {
    return res.status(403).json({ error: 'Ruxsat yo\'q' });
  }
  try {
    const helpers = await User.find({ role: 'helper', managerOfShop: req.user.managerOfShop })
      .select('name phone address role helperPermissions managerOfShop createdAt');
    
    // Преобразуем _id в id для каждого помощника
    const formattedHelpers = helpers.map(helper => {
      const { _id, __v, ...helperData } = helper.toObject();
      return {
        ...helperData,
        id: _id.toString()
      };
    });
    
    res.json(formattedHelpers);
  } catch (e) {
    console.error('List helpers error:', e);
    res.status(500).json({ error: 'Yordamchilar ro\'yxatini olishda xatolik' });
  }
});

// Assign existing user as helper for manager's shop
router.post('/helpers/assign', auth, requireManager, async (req, res) => {
  try {
    const { userId, permissions } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'Foydalanuvchi ID talab qilinadi' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    if (user.role !== 'user') {
      return res.status(400).json({ error: 'Faqat oddiy foydalanuvchini yordamchi qilish mumkin' });
    }

    user.role = 'helper';
    user.managerOfShop = req.user.managerOfShop;
    user.helperPermissions = {
      products: !!permissions?.products,
      orders: !!permissions?.orders,
      helpers: !!permissions?.helpers,
    };
    await user.save();

    const { password: _p, __v, ...safe } = user.toObject();
    safe.id = safe._id.toString();
    delete safe._id;
    res.json(safe);
  } catch (e) {
    console.error('Assign helper error:', e);
    res.status(500).json({ error: 'Yordamchini tayinlashda xatolik' });
  }
});

// Create helper for manager's shop
router.post('/helpers', auth, requireManager, async (req, res) => {
  try {
    const { name, phone, address, password, permissions } = req.body || {};
    if (!name || !phone || !address || !password) {
      return res.status(400).json({ error: 'Majburiy maydonlar talab qilinadi' });
    }

    const exists = await User.findOne({ phone });
    if (exists) return res.status(409).json({ error: 'Bu telefon raqam band' });

    const bcrypt = (await import('bcryptjs')).default;
    const hashed = await bcrypt.hash(password, 10);

    const helper = await User.create({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      password: hashed,
      role: 'helper',
      managerOfShop: req.user.managerOfShop,
      helperPermissions: {
        products: !!permissions?.products,
        orders: !!permissions?.orders,
        helpers: !!permissions?.helpers,
      },
    });

    const { password: _p, __v, ...safe } = helper.toObject();
    safe.id = safe._id.toString();
    delete safe._id;
    res.status(201).json(safe);
  } catch (e) {
    console.error('Create helper error:', e);
    res.status(500).json({ error: 'Yordamchi yaratishda xatolik' });
  }
});

// Update helper permissions (manager or helper with helpers permission)
router.patch('/helpers/:id/permissions', auth, async (req, res) => {
  try {
    // Проверяем, что это менеджер или помощник с разрешением на помощников
    if (req.user.role !== 'manager' && (req.user.role !== 'helper' || !req.user.helperPermissions?.helpers)) {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }
    
    const { id } = req.params;
    const { permissions } = req.body || {};
    const helper = await User.findById(id);
    if (!helper || helper.role !== 'helper') {
      return res.status(404).json({ error: 'Yordamchi topilmadi' });
    }
    
    // Проверяем, что helper принадлежит тому же магазину
    const helperStoreId = helper.managerOfShop?.toString();
    const userStoreId = req.user.managerOfShop?.toString();
    
    if (!helperStoreId || !userStoreId || helperStoreId !== userStoreId) {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }
    
    // Помощник не может изменять свои собственные разрешения
    if (req.user.role === 'helper' && req.user.id === helper._id.toString()) {
      return res.status(403).json({ error: 'O\'z huquqlaringizni o\'zgartira olmaysiz' });
    }
    
    helper.helperPermissions = {
      products: !!permissions?.products,
      orders: !!permissions?.orders,
      helpers: !!permissions?.helpers,
    };
    await helper.save();

    const { password: _p, __v, ...safe } = helper.toObject();
    safe.id = safe._id.toString();
    delete safe._id;
    res.json(safe);
  } catch (e) {
    console.error('Update helper permissions error:', e);
    res.status(500).json({ error: 'Yordamchi huquqlarini yangilashda xatolik' });
  }
});

// Remove helper from manager's shop (but don't delete account) - manager or helper with helpers permission
router.delete('/helpers/:id', auth, async (req, res) => {
  try {
    // Проверяем, что это менеджер или помощник с разрешением на помощников
    if (req.user.role !== 'manager' && (req.user.role !== 'helper' || !req.user.helperPermissions?.helpers)) {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }
    
    const { id } = req.params;
    const helper = await User.findById(id);
    if (!helper || helper.role !== 'helper') {
      return res.status(404).json({ error: 'Yordamchi topilmadi' });
    }
    
    // Проверяем, что helper принадлежит тому же магазину
    const helperStoreId = helper.managerOfShop?.toString();
    const userStoreId = req.user.managerOfShop?.toString();
    
    if (!helperStoreId || !userStoreId || helperStoreId !== userStoreId) {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }
    
    // Помощник не может удалить себя
    if (req.user.role === 'helper' && req.user.id === helper._id.toString()) {
      return res.status(403).json({ error: 'O\'zingizni ro\'yxatdan olib tashla olmaysiz' });
    }
    
    // Возвращаем пользователя в роль 'user' и убираем связь с магазином
    helper.role = 'user';
    helper.managerOfShop = null;
    helper.helperPermissions = undefined;
    await helper.save();

    res.json({ success: true, message: 'Yordamchi ro\'yxatdan olib tashlandi' });
  } catch (e) {
    console.error('Remove helper error:', e);
    res.status(500).json({ error: 'Yordamchini olib tashlashda xatolik' });
  }
});

export default router;
