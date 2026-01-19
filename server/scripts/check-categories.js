import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/avtofix';

async function checkCategories() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const categoriesCollection = db.collection('categories');

    // Barcha kategoriyalarni sanash
    const totalCount = await categoriesCollection.countDocuments();
    console.log(`\n📊 Total categories: ${totalCount}`);

    if (totalCount === 0) {
      console.log('\n⚠️  No categories found in database!');
      console.log('You need to add categories first.');
    } else {
      // Birinchi 10 ta kategoriyani ko'rsatish
      const categories = await categoriesCollection.find({}).limit(10).toArray();
      console.log('\n📂 Sample categories:');
      categories.forEach(cat => {
        console.log(`  - ${cat.name} (ID: ${cat._id}, parentId: ${cat.parentId || 'null'}, level: ${cat.level || 0})`);
      });

      // Root kategoriyalarni sanash
      const rootCount = await categoriesCollection.countDocuments({
        $or: [
          { parentId: null },
          { parentId: { $exists: false } },
          { level: 0 }
        ]
      });
      console.log(`\n🌳 Root categories: ${rootCount}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCategories();
