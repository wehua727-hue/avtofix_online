import "dotenv/config";
import connectDB from "../db/connection.js";
import fs from "fs";
import path from "path";
import Store from "../models/Store.js";
import Product from "../models/Product.js";

const ensureUploadsDir = async (uploadDir) => {
  await fs.promises.mkdir(uploadDir, { recursive: true });
};

const isBase64Image = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  return value.startsWith("data:image/");
};

const decodeBase64Image = (dataUrl) => {
  const matches = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!matches || matches.length !== 3) {
    throw new Error("Unsupported image data URL format");
  }

  const extensionMap = {
    png: "png",
    jpeg: "jpg",
    jpg: "jpg",
    webp: "webp",
  };

  const extension = extensionMap[matches[1].toLowerCase()] ?? "jpg";
  const buffer = Buffer.from(matches[2], "base64");
  return { extension, buffer };
};

const writeImageFile = async (uploadDir, buffer, extension) => {
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const absolutePath = path.join(uploadDir, fileName);
  await fs.promises.writeFile(absolutePath, buffer);
  return { fileName, absolutePath, publicPath: `/uploads/${fileName}` };
};

const migrateCollection = async (Model, query, uploadDir) => {
  const cursor = Model.find(query).cursor();
  let migrated = 0;
  let cleared = 0;

  for await (const doc of cursor) {
    try {
      const imageValue = doc.image;

      if (!imageValue) {
        continue;
      }

      if (isBase64Image(imageValue)) {
        const { buffer, extension } = decodeBase64Image(imageValue);
        const { publicPath } = await writeImageFile(uploadDir, buffer, extension);
        doc.imageUrl = publicPath;
        doc.image = undefined;
        await doc.save();
        migrated += 1;
      } else {
        doc.image = undefined;
        doc.imageUrl = imageValue;
        await doc.save();
        cleared += 1;
      }
    } catch (error) {
      console.error(`Failed to migrate document ${doc._id}`, error);
    }
  }

  return { migrated, cleared };
};

const run = async () => {
  try {
    await connectDB();

    const uploadDir = process.env.UPLOAD_DIR
      ? path.resolve(process.cwd(), process.env.UPLOAD_DIR)
      : path.resolve(process.cwd(), "uploads");

    await ensureUploadsDir(uploadDir);

    const storeResults = await migrateCollection(
      Store,
      { image: { $exists: true, $ne: "" } },
      uploadDir,
    );

    const productResults = await migrateCollection(
      Product,
      { image: { $exists: true, $ne: "" } },
      uploadDir,
    );

    console.log("Store documents migrated:", storeResults.migrated);
    console.log("Store documents converted without files:", storeResults.cleared);
    console.log("Product documents migrated:", productResults.migrated);
    console.log("Product documents converted without files:", productResults.cleared);
    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Failed to migrate inline images:", error);
  } finally {
    process.exit(0);
  }
};

run();
