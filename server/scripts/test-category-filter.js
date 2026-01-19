import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

// MongoDB'ga ulanish
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Kategoriyalar va mahsulotlarni tekshirish
const testCategoryFilter = async () => {
  try {
    const db = mongoose.connection.db;
    const categoriesCollection = db.collection('categories');
    
    // Barcha kategoriyalarni ko'rsatish
    const allCategories = await categoriesCollection.find({}).toArray();
    console.log(`\n📋 Total categories: ${allCategories.length}`);
    console.log('\nAll categories:');
    allCategories.forEach(cat => {
      console.log(`  - ${cat.name} (ID: ${cat._id})`);
    });
    
    // Har bir kategoriya uchun mahsulotlar sonini sanash
    console.log('\n📦 Products per category:');
    for (const cat of allCategories) {
      const { ObjectId } = mongoose.Types;
      
      // String va ObjectId formatlarida qidirish
      const count1 = await Product.countDocuments({ categoryId: cat._id.toString() });
      const count2 = await Product.countDocuments({ categoryId: new ObjectId(cat._id) });
      const count3 = await Product.countDocuments({ categoryId: cat._id });
      
      console.log(`  ${cat.name}:`);
      console.log(`    - String format: ${count1}`);
      console.log(`    - ObjectId format: ${count2}`);
      console.log(`    - Direct _id: ${count3}`);
      
      // Birinchi mahsulotni ko'rsatish
      const sampleProduct = await Product.findOne({ categoryId: cat._id }).lean();
      if (sampleProduct) {
        console.log(`    - Sample: ${sampleProduct.name}`);
        console.log(`    - categoryId type: ${typeof sampleProduct.categoryId}`);
        console.log(`    - categoryId value: ${sampleProduct.categoryId}`);
      }
    }
    
    // Barcha mahsulotlarning categoryId maydonini tekshiramiz
    const allProducts = await Product.find({}).limit(5).lean();
    console.log(`\n📦 Sample products (first 5):`);
    allProducts.forEach(p => {
      console.log(`  - ${p.name}`);
      console.log(`    categoryId: ${p.categoryId} (type: ${typeof p.categoryId})`);
      console.log(`    category: ${p.category || 'null'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
};

// Run script
(async () => {
  await connectDB();
  await testCategoryFilter();
})();
