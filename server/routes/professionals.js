import express from "express";
import Professional from "../models/Professional.js";
const router = express.Router();

// Get all professionals
router.get("/", async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { page = 1, limit = 20, adminPanel } = req.query;
    let filter = { isActive: true };

    // Agar user ID mavjud bo'lsa, user'ni topish
    if (userId && adminPanel === 'true') {
      const User = (await import("../models/User.js")).default;
      const user = await User.findById(userId).lean();
      
      // Admin faqat o'zi yaratgan ustalarni ko'radi
      if (user && user.role === 'admin') {
        filter.createdBy = userId;
      }
      // Owner barcha ustalarni ko'radi (filter bo'sh)
      
      // Admin panel uchun barcha ustalar
      const professionals = await Professional.find(filter)
        .populate('createdBy', 'name role')
        .sort({ createdAt: -1 })
        .lean();
      return res.json(professionals);
    }

    // Bosh sahifa uchun paginatsiya
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [professionals, total] = await Promise.all([
      Professional.find(filter)
        .select('name phone image images specialty specialties experience rating region district address latitude longitude workingHours services category categoryId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Professional.countDocuments(filter)
    ]);

    res.json({
      professionals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasMore: skip + professionals.length < total
      }
    });
  } catch (error) {
    console.error("Error fetching professionals:", error);
    // MongoDB ulanmasa ham empty array qaytarish
    res.json({
      professionals: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
        hasMore: false
      }
    });
  }
});

// Get professional by ID
router.get("/:id", async (req, res) => {
  try {
    const professional = await Professional.findById(req.params.id);
    if (!professional) {
      return res.status(404).json({ error: "Professional not found" });
    }
    res.json(professional);
  } catch (error) {
    console.error("Error fetching professional:", error);
    res.status(500).json({ error: "Failed to fetch professional" });
  }
});

// Create new professional
router.post("/", async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { createdByUserId, ...professionalData } = req.body;

    console.log('🔧 Creating professional with data:', {
      name: professionalData.name,
      latitude: professionalData.latitude,
      longitude: professionalData.longitude,
      address: professionalData.address
    });

    if (!userId) {
      return res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
    }

    // Kim nomidan qo'shilayotganini aniqlash
    const finalCreatedBy = createdByUserId || userId;

    // Admin owner nomidan qo'sha olmaydi
    const User = (await import("../models/User.js")).default;
    const currentUser = await User.findById(userId);
    const targetUser = await User.findById(finalCreatedBy);

    if (currentUser && currentUser.role === 'admin' && targetUser && targetUser.role === 'owner') {
      return res.status(403).json({ error: "Admin owner nomidan usta qo'sha olmaydi" });
    }

    const professional = new Professional({
      ...professionalData,
      createdBy: finalCreatedBy, // Tanlangan foydalanuvchi nomidan
    });
    await professional.save();
    
    console.log('✅ Professional created:', {
      id: professional._id,
      name: professional.name,
      latitude: professional.latitude,
      longitude: professional.longitude,
      address: professional.address
    });
    
    res.status(201).json(professional);
  } catch (error) {
    console.error("Error creating professional:", error);
    res.status(500).json({ error: "Failed to create professional" });
  }
});

// Update professional
router.put("/:id", async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
    }

    // Ustani topish
    const existingProfessional = await Professional.findById(req.params.id);
    if (!existingProfessional) {
      return res.status(404).json({ error: "Usta topilmadi" });
    }

    // User rolini tekshirish
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId);
    
    // Admin faqat o'zi yaratgan ustani o'zgartira oladi
    if (user && user.role === 'admin' && existingProfessional.createdBy.toString() !== userId) {
      return res.status(403).json({ error: "Siz faqat o'zingiz yaratgan ustani o'zgartira olasiz" });
    }

    const professional = await Professional.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!professional) {
      return res.status(404).json({ error: "Usta topilmadi" });
    }
    res.json(professional);
  } catch (error) {
    console.error("Error updating professional:", error);
    res.status(500).json({ error: "Ustani yangilashda xatolik" });
  }
});

// Delete professional
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
    }

    // Ustani topish
    const professional = await Professional.findById(req.params.id);
    if (!professional) {
      return res.status(404).json({ error: "Usta topilmadi" });
    }

    // User rolini tekshirish
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId);
    
    // Admin faqat o'zi yaratgan ustani o'chira oladi
    if (user && user.role === 'admin' && professional.createdBy.toString() !== userId) {
      return res.status(403).json({ error: "Siz faqat o'zingiz yaratgan ustani o'chira olasiz" });
    }

    await Professional.findByIdAndDelete(req.params.id);
    res.json({ message: "Usta muvaffaqiyatli o'chirildi" });
  } catch (error) {
    console.error("Error deleting professional:", error);
    res.status(500).json({ error: "Ustani o'chirishda xatolik" });
  }
});

export default router;
