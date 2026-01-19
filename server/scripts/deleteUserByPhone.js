import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const deleteUserByPhone = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Telefon raqamni command line argumentdan olish
    const phone = process.argv[2];

    if (!phone) {
      console.log('\n❌ Telefon raqam kiritilmadi!');
      console.log('Foydalanish: node server/scripts/deleteUserByPhone.js <telefon_raqam>');
      console.log('Misol: node server/scripts/deleteUserByPhone.js 774562398\n');
      process.exit(1);
    }

    // Foydalanuvchini topish
    const user = await User.findOne({ phone });

    if (!user) {
      console.log(`\n❌ Telefon raqam ${phone} bilan foydalanuvchi topilmadi\n`);
      process.exit(1);
    }

    console.log('\n=== Topilgan Foydalanuvchi ===');
    console.log(`Ism: ${user.name}`);
    console.log(`Telefon: ${user.phone}`);
    console.log(`Viloyat: ${user.region}`);
    console.log(`Tuman: ${user.district}`);
    console.log(`Role: ${user.role}`);
    console.log(`ID: ${user._id}`);

    // O'chirish
    await User.deleteOne({ _id: user._id });
    console.log('\n✅ Foydalanuvchi muvaffaqiyatli o\'chirildi!\n');

    process.exit(0);
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  }
};

deleteUserByPhone();
