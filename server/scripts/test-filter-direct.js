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

// To'g'ridan-to'g'ri filter test
const testFilter = async () => {
  try {
    const categoryId = '69620ac168c8e4ab93172fd6';
    
    console.log('\n🔍 Testing filter with categoryId:', categoryId);
    
    // Test 1: Faqat categoryId bilan
    const test1 = await Product.find({ categoryId: categoryId }).limit(5).lean();
    console.log('\n📦 Test 1 - categoryId only:', test1.length, 'products');
    if (test1.length > 0) {
      console.log('  Sample:', test1[0].name);
    }
    
    // Test 2: categoryId $in bilan
    const test2 = await Product.find({ categoryId: { $in: [categoryId] } }).limit(5).lean();
    console.log('\n📦 Test 2 - categoryId with $in:', test2.length, 'products');
    if (test2.length > 0) {
      console.log('  Sample:', test2[0].name);
    }
    
    // Test 3: isHidden filter bilan
    const test3 = await Product.find({
      categoryId: categoryId,
      $or: [
        { isHidden: { $ne: true } },
        { isHidden: { $exists: false } }
      ]
    }).limit(5).lean();
    console.log('\n📦 Test 3 - with isHidden filter:', test3.length, 'products');
    if (test3.length > 0) {
      console.log('  Sample:', test3[0].name);
    }
    
    // Test 4: $and bilan
    const test4 = await Product.find({
      $and: [
        {
          $or: [
            { isHidden: { $ne: true } },
            { isHidden: { $exists: false } }
          ]
        },
        { categoryId: { $in: [categoryId] } }
      ]
    }).limit(5).lean();
    console.log('\n📦 Test 4 - with $and:', test4.length, 'products');
    if (test4.length > 0) {
      console.log('  Sample:', test4[0].name);
    }
    
    // Test 5: Barcha mahsulotlar (isHidden filter bilan)
    const test5 = await Product.find({
      $or: [
        { isHidden: { $ne: true } },
        { isHidden: { $exists: false } }
      ]
    }).limit(5).lean();
    console.log('\n📦 Test 5 - all products (with isHidden):', test5.length, 'products');
    if (test5.length > 0) {
      console.log('  Sample:', test5[0].name);
      console.log('  categoryId:', test5[0].categoryId);
    }
    
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
  await testFilter();
})();
