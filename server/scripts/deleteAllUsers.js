import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const deleteAllUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Barcha foydalanuvchilarni sanash
    const count = await User.countDocuments();
    
    if (count === 0) {
      console.log('\n✅ Database bo\'sh, o\'chiriladigan foydalanuvchi yo\'q\n');
      process.exit(0);
    }

    console.log(`\n⚠️  DIQQAT: ${count} ta foydalanuvchi o'chiriladi!`);
    console.log('Bu amal qaytarib bo\'lmaydi!\n');

    // Tasdiqlash uchun argument tekshirish
    const confirm = process.argv[2];
    
    if (confirm !== '--confirm') {
      console.log('❌ Tasdiqlash kerak!');
      console.log('Barcha foydalanuvchilarni o\'chirish uchun quyidagi buyruqni ishlating:');
      console.log('node server/scripts/deleteAllUsers.js --confirm\n');
      process.exit(1);
    }

    // Barcha foydalanuvchilarni o'chirish
    const result = await User.deleteMany({});
    console.log(`✅ ${result.deletedCount} ta foydalanuvchi o'chirildi!\n`);

    process.exit(0);
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  }
};

deleteAllUsers();
