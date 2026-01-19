import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createMainOwner = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    const phone = '775236984';
    const password = '75321456';
    const name = 'Main Owner';

    // Tekshirish: Foydalanuvchi mavjudmi?
    let owner = await User.findOne({ phone });

    if (owner) {
      console.log('\n=== Mavjud Foydalanuvchi ===');
      console.log(`Ism: ${owner.name}`);
      console.log(`Telefon: ${owner.phone}`);
      console.log(`Hozirgi rol: ${owner.role}`);
      console.log(`ID: ${owner._id}`);

      // Agar owner bo'lmasa, owner qilish
      if (owner.role !== 'owner') {
        owner.role = 'owner';
        await owner.save();
        console.log('\n✅ Foydalanuvchi owner qilindi!');
      } else {
        console.log('\n✅ Foydalanuvchi allaqachon owner!');
      }
    } else {
      // Yangi owner yaratish
      console.log('\n=== Yangi Owner Yaratilmoqda ===');
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      owner = await User.create({
        name,
        phone,
        region: 'Toshkent shahri',
        district: 'Yunusobod tumani',
        password: hashedPassword,
        role: 'owner',
      });

      console.log('✅ Yangi owner yaratildi!');
      console.log(`Ism: ${owner.name}`);
      console.log(`Telefon: ${owner.phone}`);
      console.log(`Rol: ${owner.role}`);
      console.log(`ID: ${owner._id}`);
    }

    console.log('\n📝 Login Ma\'lumotlari:');
    console.log(`Telefon: ${phone}`);
    console.log(`Parol: ${password}`);
    console.log(`Rol: owner`);
    console.log('\n✅ Bu foydalanuvchi doim owner bo\'ladi!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
};

createMainOwner();
