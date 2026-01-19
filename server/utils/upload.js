import multer from "multer";
import sharp from "sharp";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB limit

const storage = multer.memoryStorage();

const imageFileFilter = (_req, file, callback) => {
  if (!file.mimetype.startsWith("image/")) {
    callback(new Error("Faqat rasm fayllariga ruxsat beriladi"));
    return;
  }
  callback(null, true);
};

export const uploadSingleImage = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: imageFileFilter,
}).single("image");

export const processAndStoreImage = async (fileBuffer, originalName, uploadDir) => {
  if (!fileBuffer) {
    console.error("ERROR: fileBuffer is null or undefined");
    return null;
  }
  if (!uploadDir) {
    console.error("ERROR: uploadDir is required");
    throw new Error("uploadDir is required");
  }

  console.log("=== processAndStoreImage ===");
  console.log("fileBuffer type:", typeof fileBuffer);
  console.log("fileBuffer is string:", typeof fileBuffer === 'string');
  console.log("fileBuffer length:", typeof fileBuffer === 'string' ? fileBuffer.length : (fileBuffer?.length || 'unknown'));
  console.log("originalName:", originalName);
  console.log("uploadDir:", uploadDir);

  // Agar base64 string bo'lsa, Buffer'ga o'tkazish
  let buffer = fileBuffer;
  if (typeof fileBuffer === 'string') {
    console.log("Converting base64 string to buffer...");
    // base64 string'ni Buffer'ga o'tkazish
    const base64Data = fileBuffer.replace(/^data:image\/\w+;base64,/, '');
    console.log("Base64 data length:", base64Data.length);
    buffer = Buffer.from(base64Data, 'base64');
    console.log("Buffer created, size:", buffer.length, "bytes");
  }

  // Target max 100KB
  const MAX_BYTES = 100 * 1024;
  try {
    console.log("Creating sharp image...");
    const image = sharp(buffer).rotate();
    console.log("Getting metadata...");
    const meta = await image.metadata();
    console.log("Metadata:", { width: meta.width, height: meta.height, format: meta.format });

    // Start with width cap 1080 and quality ladder; reduce until under limit
    const baseWidth = Math.min(1080, meta.width || 1080);
    const qualitySteps = [75, 70, 65, 60, 55, 50, 45, 40, 35, 30];
    const scaleSteps = [1, 0.9, 0.8, 0.7, 0.6, 0.5];

    let bestBuf = null;
    console.log("Processing image with quality ladder...");
    outer: for (const scale of scaleSteps) {
      const width = Math.max(320, Math.floor(baseWidth * scale));
      for (const q of qualitySteps) {
        const buf = await sharp(buffer)
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .jpeg({ quality: q })
          .toBuffer();
        bestBuf = buf;
        if (buf.length <= MAX_BYTES) {
          console.log(`Found optimal size: ${buf.length} bytes at scale ${scale}, quality ${q}`);
          break outer;
        }
      }
    }

    const processed = bestBuf || (await sharp(buffer)
      .rotate()
      .resize({ width: baseWidth, withoutEnlargement: true })
      .jpeg({ quality: 30 })
      .toBuffer());
    
    console.log("Image processing complete, final size:", processed.length, "bytes");

    // Generate unique filename
    const filename = originalName 
      ? `${crypto.randomUUID()}${path.extname(originalName)}`
      : `${crypto.randomUUID()}.jpg`;
    
    // Ensure filename ends with .jpg since we convert to JPEG
    const finalFilename = filename.endsWith('.jpg') ? filename : `${path.parse(filename).name}.jpg`;
    const filePath = path.join(uploadDir, finalFilename);

    console.log("Final filename:", finalFilename);
    console.log("File path:", filePath);

    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    console.log("Upload directory ensured");

    // Save file to disk
    console.log("Writing file to disk...");
    await fs.writeFile(filePath, processed);
    console.log("File written successfully, size:", processed.length, "bytes");

    const url = `https://avtofix.uz/api/uploads/${finalFilename}`;
    console.log("Generated URL:", url);

    return {
      id: finalFilename,
      filename: finalFilename,
      url,
    };
  } catch (err) {
    console.error("ERROR in processAndStoreImage:", err);
    throw err;
  }
};

export const removeImageByUrl = async (imageUrl, uploadDir) => {
  if (!imageUrl || !uploadDir) return;
  
  // Expecting /api/uploads/:filename or /uploads/:filename (for backward compatibility)
  let filename = null;
  
  // Try to match /api/uploads/:filename
  const apiUploadsMatch = imageUrl.match(/\/api\/uploads\/(.+)$/);
  if (apiUploadsMatch) {
    filename = apiUploadsMatch[1];
  } else {
    // Try to match old format /uploads/:filename
    const uploadsMatch = imageUrl.match(/\/uploads\/(.+)$/);
    if (uploadsMatch) {
      filename = uploadsMatch[1];
    } else {
      // Try to match old format /api/images/:id
      const apiMatch = imageUrl.match(/\/api\/images\/(.+)$/);
      if (apiMatch) {
        filename = apiMatch[1];
      }
    }
  }
  
  if (filename) {
    try {
      const filePath = path.join(uploadDir, filename);
      await fs.unlink(filePath);
    } catch (e) {
      // File might not exist, ignore error
      console.warn("Rasmni o'chirishda xatolik:", e.message);
    }
  }
};

