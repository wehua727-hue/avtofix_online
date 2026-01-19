import express from "express";
import CarBrand from "../models/CarBrand.js";

const router = express.Router();

// Barcha mashina brendlarini olish (eng ko'p ishlatiladiganlar birinchi)
router.get("/", async (req, res) => {
  try {
    const brands = await CarBrand.find()
      .sort({ usageCount: -1, name: 1 })
      .select("name usageCount")
      .lean();
    res.json(brands);
  } catch (error) {
    console.error("Error fetching car brands:", error);
    res.status(500).json({ error: "Mashina brendlarini olishda xatolik" });
  }
});

// Yangi mashina brendi qo'shish
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.headers["x-user-id"];

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Mashina nomi talab qilinadi" });
    }

    const normalizedName = name.trim();

    // Mavjud brendni tekshirish (case-insensitive)
    let brand = await CarBrand.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, "i") },
    });

    if (brand) {
      // Mavjud bo'lsa, usageCount ni oshirish
      brand.usageCount += 1;
      await brand.save();
      return res.json(brand);
    }

    // Yangi brend yaratish
    brand = await CarBrand.create({
      name: normalizedName,
      createdBy: userId || null,
      usageCount: 1,
    });

    res.status(201).json(brand);
  } catch (error) {
    console.error("Error creating car brand:", error);
    res.status(500).json({ error: "Mashina brendini qo'shishda xatolik" });
  }
});

// Qidiruv (autocomplete uchun)
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) {
      return res.json([]);
    }

    const brands = await CarBrand.find({
      name: { $regex: q, $options: "i" },
    })
      .sort({ usageCount: -1 })
      .limit(10)
      .select("name")
      .lean();

    res.json(brands);
  } catch (error) {
    console.error("Error searching car brands:", error);
    res.status(500).json({ error: "Qidirishda xatolik" });
  }
});

export default router;
