import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Professional from "../models/Professional.js";

async function createIndexes() {
  try {
    console.log("🔄 MongoDB'ga ulanmoqda...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");

    console.log("\n📊 Indekslar yaratilmoqda...");

    // Product indekslari
    await Product.collection.createIndex({ userId: 1, store: 1, isHidden: 1 });
    await Product.collection.createIndex({ createdAt: -1 });
    await Product.collection.createIndex({ store: 1 });
    await Product.collection.createIndex({ createdBy: 1 });
    console.log("✅ Product indekslari yaratildi");

    // Professional indekslari
    await Professional.collection.createIndex({ isActive: 1, createdAt: -1 });
    await Professional.collection.createIndex({ createdBy: 1 });
    console.log("✅ Professional indekslari yaratildi");

    // Mavjud indekslarni ko'rsatish
    const productIndexes = await Product.collection.indexes();
    const professionalIndexes = await Professional.collection.indexes();
    
    console.log("\n📋 Product indekslari:", productIndexes.map(i => i.name));
    console.log("📋 Professional indekslari:", professionalIndexes.map(i => i.name));

    console.log("\n✅ Barcha indekslar muvaffaqiyatli yaratildi!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Xatolik:", error);
    process.exit(1);
  }
}

createIndexes();
