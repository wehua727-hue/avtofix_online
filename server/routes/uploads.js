import express from "express";
import { uploadSingleImage, processAndStoreImage } from "../utils/upload.js";

const router = express.Router();

router.post("/", (req, res) => {
  uploadSingleImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Rasm yuklashda xatolik" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Fayl topilmadi" });
    }

    try {
      const uploadDir = req.app.locals.uploadDir;
      const info = await processAndStoreImage(req.file.buffer, req.file.originalname, uploadDir);
      return res.json({
        id: info.id,
        filename: info.filename,
        url: info.url,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
    } catch (e) {
      console.error("Upload save error:", e);
      return res.status(500).json({ error: "Rasmni saqlashda xatolik" });
    }
  });
});

export default router;

