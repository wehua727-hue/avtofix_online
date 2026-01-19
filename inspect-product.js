
import mongoose from 'mongoose';
import Product from './server/models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/avtofix";

async function inspectProduct() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Search for the product by name as seen in the log
    const name = 'Элемент ФТОТ 6W.24.059.00 / UFI';
    const product = await Product.findOne({ name });
    
    if (product) {
        console.log('FOUND PRODUCT:', product._id);
        console.log('Raw Document:', product.toObject());
        console.log('-----------------------------------');
        console.log('stockCount:', product.stockCount);
        console.log('stock:', product.stock);
        console.log('quantity:', product.quantity);
        console.log('qty:', product.qty);
        console.log('count:', product.count);
        console.log('inStock:', product.inStock);
    } else {
        console.log('Product not found with name:', name);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

inspectProduct();
