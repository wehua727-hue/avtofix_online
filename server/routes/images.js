import express from "express";
import mongoose from "mongoose";
import Image from "../models/Image.js";

const router = express.Router();

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Noto'g'ri rasm ID" });
    }

    // Use Mongoose doc (not lean) to retain Buffer type if possible
    const image = await Image.findById(id);
    if (!image) {
      return res.status(404).json({ error: "Rasm topilmadi" });
    }

    // Ensure we send a Node.js Buffer
    const bin = image.data;
    const buf = Buffer.isBuffer(bin)
      ? bin
      : (bin && bin.buffer)
        ? Buffer.from(bin.buffer)
        : Buffer.from(bin);

    const lastMod = image.updatedAt || image.createdAt || new Date();
    const etag = `W/"${image._id.toString()}-${buf.length}-${new Date(lastMod).getTime()}"`;

    // Conditional requests
    if (req.headers['if-none-match'] === etag) {
      res.status(304);
      res.setHeader("ETag", etag);
      res.setHeader("Last-Modified", new Date(lastMod).toUTCString());
      return res.end();
    }
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince && new Date(ifModifiedSince) >= new Date(lastMod)) {
      res.status(304);
      res.setHeader("ETag", etag);
      res.setHeader("Last-Modified", new Date(lastMod).toUTCString());
      return res.end();
    }

    res.setHeader("Content-Type", image.contentType || "image/jpeg");
    res.setHeader("Content-Length", image.size || buf.length);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", etag);
    res.setHeader("Last-Modified", new Date(lastMod).toUTCString());

    return res.end(buf);
  } catch (err) {
    console.error("Image fetch error:", err);
    return res.status(500).json({ error: "Rasmni olishda xatolik" });
  }
});

export default router;
