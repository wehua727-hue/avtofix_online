import mongoose from "mongoose";

const connectDB = async () => {
  try {
    console.log("🔄 MongoDB'ga ulanmoqda...");
    
    // Connection options
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 soniya timeout
      socketTimeoutMS: 45000, // 45 soniya socket timeout
      maxPoolSize: 20,
      minPoolSize: 5,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      console.error("💡 Internet ulanishini tekshiring yoki MongoDB Atlas'ga kirish mumkinligini tasdiqlang");
    }
    
    if (error.message.includes('authentication failed')) {
      console.error("💡 MongoDB username yoki password noto'g'ri");
    }
    
    console.error("\n📝 .env faylida MONGODB_URI to'g'ri ekanligini tekshiring");
    console.error("MONGODB_URI:", process.env.MONGODB_URI ? "✅ Mavjud" : "❌ Yo'q");
    
    // Server ishlaydi MongoDB'siz ham
    console.log("\n⚠️  Server ishlayapti, lekin MongoDB ulanmagan. Frontend ko'rsatiladi, API ma'lumot qaytarmaydi.");
  }
};

export default connectDB;
