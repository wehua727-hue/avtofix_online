import mongoose from 'mongoose';
import dotenv from 'dotenv';

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

// "h1" va noto'g'ri kategoriyalarni o'chirish
const cleanCategories = async () => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('categories');
    
    // Barcha kategoriyalarni ko'rsatish
    const allCategories = await collection.find({}).toArray();
    console.log(`\n📋 Total categories: ${allCategories.length}`);
    console.log('\nAll categories:');
    allCategories.forEach(cat => {
      console.log(`  - ${cat.name} (ID: ${cat._id}, parentId: ${cat.parentId || 'null'})`);
    });
    
    // "h1" nomli kategoriyalarni topish (case-insensitive va partial match)
    const h1Categories = await collection.find({ 
      name: { $regex: /h1/i } 
    }).toArray();
    
    console.log(`\n📦 Found ${h1Categories.length} "h1" categories`);
    
    if (h1Categories.length > 0) {
      h1Categories.forEach(cat => {
        console.log(`  - Deleting: ${cat.name} (ID: ${cat._id})`);
      });
      
      // O'chirish
      const result = await collection.deleteMany({ 
        name: { $regex: /h1/i } 
      });
      
      console.log(`\n✅ Deleted ${result.deletedCount} "h1" categories`);
    } else {
      console.log('\n✅ No "h1" categories found');
    }
    
    // Noto'g'ri kategoriyalarni topish (name bo'sh yoki null)
    const invalidCategories = await collection.find({
      $or: [
        { name: null },
        { name: '' },
        { name: { $exists: false } }
      ]
    }).toArray();
    
    if (invalidCategories.length > 0) {
      console.log(`\n📦 Found ${invalidCategories.length} invalid categories (empty name)`);
      const deleteResult = await collection.deleteMany({
        $or: [
          { name: null },
          { name: '' },
          { name: { $exists: false } }
        ]
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} invalid categories`);
    }
    
    // Yangilangan ro'yxatni ko'rsatish
    const updatedCategories = await collection.find({}).toArray();
    console.log(`\n📋 Updated total categories: ${updatedCategories.length}`);
    console.log('\nRemaining categories:');
    updatedCategories.forEach(cat => {
      console.log(`  - ${cat.name} (ID: ${cat._id})`);
    });
    
  } catch (error) {
    console.error('❌ Error cleaning categories:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
};

// Run script
(async () => {
  await connectDB();
  await cleanCategories();
})();
