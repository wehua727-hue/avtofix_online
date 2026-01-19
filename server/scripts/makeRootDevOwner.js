import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const makeRootDevOwner = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // RootDev foydalanuvchisini topish
    const rootDev = await User.findOne({ name: 'RootDev' });

    if (!rootDev) {
      console.log('\n❌ RootDev foydalanuvchisi topilmadi!');
      console.log('Iltimos, avval RootDev nomli foydalanuvchi yarating.\n');
      process.exit(1);
    }

    console.log('\n=== Topilgan Foydalanuvchi ===');
    console.log(`Ism: ${rootDev.name}`);
    console.log(`Telefon: ${rootDev.phone}`);
    console.log(`Hozirgi rol: ${rootDev.role}`);
    console.log(`ID: ${rootDev._id}`);

    if (rootDev.role === 'owner') {
      console.log('\n✅ RootDev allaqachon owner!\n');
      process.exit(0);
    }

    // Owner qilish
    rootDev.role = 'owner';
    await rootDev.save();

    console.log('\n✅ RootDev muvaffaqiyatli owner qilindi!');
    console.log(`Yangi rol: ${rootDev.role}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  }
};

makeRootDevOwner();
