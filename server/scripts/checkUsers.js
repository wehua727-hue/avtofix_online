import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Barcha foydalanuvchilarni ko'rsatish
    const users = await User.find({});
    console.log('\n=== Barcha Foydalanuvchilar ===');
    console.log(`Jami: ${users.length} ta foydalanuvchi\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. Ism: ${user.name}`);
      console.log(`   Telefon: ${user.phone}`);
      console.log(`   Viloyat: ${user.region}`);
      console.log(`   Tuman: ${user.district}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user._id}`);
      console.log('---');
    });

    // Telefon raqam bo'yicha dublikatlarni tekshirish
    const phoneGroups = {};
    users.forEach(user => {
      if (!phoneGroups[user.phone]) {
        phoneGroups[user.phone] = [];
      }
      phoneGroups[user.phone].push(user);
    });

    const duplicates = Object.entries(phoneGroups).filter(([phone, users]) => users.length > 1);
    
    if (duplicates.length > 0) {
      console.log('\n⚠️  DUBLIKAT TELEFON RAQAMLAR TOPILDI:');
      duplicates.forEach(([phone, users]) => {
        console.log(`\nTelefon: ${phone} (${users.length} ta foydalanuvchi)`);
        users.forEach(user => {
          console.log(`  - ${user.name} (ID: ${user._id})`);
        });
      });
    } else {
      console.log('\n✅ Dublikat telefon raqamlar yo\'q');
    }

    process.exit(0);
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  }
};

checkUsers();
