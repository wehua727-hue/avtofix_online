import mongoose from 'mongoose';
import Product from './server/models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  const products = await Product.find({ store: '695ca54fae9c17a1116a5859' })
    .select('name code sku')
    .limit(15)
    .lean();
  
  console.log('\n📦 First 15 products from database:\n');
  products.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}`);
    console.log(`   Code: ${p.code}, SKU: ${p.sku}`);
  });
  
  process.exit();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
