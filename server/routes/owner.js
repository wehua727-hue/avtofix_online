import express from 'express';
import auth, { requireOwner } from '../middleware/auth.js';
import Store from '../models/Store.js';
import User from '../models/User.js';

const router = express.Router();

// Assign a manager to a store
router.post('/assign-manager', auth, requireOwner, async (req, res) => {
  try {
    const { storeId, managerUserId } = req.body || {};
    if (!storeId || !managerUserId) {
      return res.status(400).json({ error: 'storeId va managerUserId talab qilinadi' });
    }

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ error: 'Magazin topilmadi' });

    const user = await User.findById(managerUserId);
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    // Clear previous manager's linkage if exists and different
    if (store.manager && store.manager.toString() !== managerUserId) {
      const prev = await User.findById(store.manager);
      if (prev && prev.role === 'manager' && prev.managerOfShop?.toString() === store._id.toString()) {
        prev.managerOfShop = null;
        await prev.save();
      }
    }

    // Set new manager
    store.manager = managerUserId;
    await store.save();

    if (user.role !== 'owner') {
      user.role = 'manager';
    }
    user.managerOfShop = store._id;
    await user.save();

    const populated = await Store.findById(store._id)
      .populate('manager', 'name role')
      .populate('createdBy', 'name role');

    return res.json(populated);
  } catch (error) {
    console.error('Assign manager error:', error);
    return res.status(500).json({ error: 'Menedjerni tayinlashda xatolik' });
  }
});

export default router;
