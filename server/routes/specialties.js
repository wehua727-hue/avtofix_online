import express from "express";
import Specialty from "../models/Specialty.js";

const router = express.Router();

// Get all specialties
router.get("/", async (req, res) => {
  try {
    const specialties = await Specialty.find().sort({ name: 1 });
    res.json(specialties);
  } catch (error) {
    console.error("Error fetching specialties:", error);
    res.status(500).json({ error: "Failed to fetch specialties" });
  }
});

// Create new specialty
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Mutaxassislik nomi kiritilishi shart" });
    }

    // Mavjudligini tekshirish
    const existing = await Specialty.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });
    
    if (existing) {
      return res.status(400).json({ error: "Bu mutaxassislik allaqachon mavjud" });
    }

    const specialty = new Specialty({ name: name.trim() });
    await specialty.save();
    res.status(201).json(specialty);
  } catch (error) {
    console.error("Error creating specialty:", error);
    res.status(500).json({ error: "Failed to create specialty" });
  }
});

// Delete specialty
router.delete("/:id", async (req, res) => {
  try {
    const specialty = await Specialty.findByIdAndDelete(req.params.id);
    if (!specialty) {
      return res.status(404).json({ error: "Mutaxassislik topilmadi" });
    }
    res.json({ message: "Mutaxassislik o'chirildi" });
  } catch (error) {
    console.error("Error deleting specialty:", error);
    res.status(500).json({ error: "Failed to delete specialty" });
  }
});

export default router;
