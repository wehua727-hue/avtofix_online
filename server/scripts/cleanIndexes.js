import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';

dotenv.config();

const cleanIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Drop all indexes and recreate them
    console.log('Cleaning User indexes...');
    await User.collection.dropIndexes();
    await User.createIndexes();
    console.log('User indexes cleaned');

    console.log('Cleaning Order indexes...');
    await Order.collection.dropIndexes();
    await Order.createIndexes();
    console.log('Order indexes cleaned');

    console.log('Cleaning Category indexes...');
    await Category.collection.dropIndexes();
    await Category.createIndexes();
    console.log('Category indexes cleaned');

    console.log('All indexes cleaned successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning indexes:', error);
    process.exit(1);
  }
};

cleanIndexes();
