import mongoose from "mongoose";
import Product from "../models/Product.js";
import Professional from "../models/Professional.js";
import "dotenv/config";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected for seeding");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

const seedProducts = async () => {
  const products = [
    {
      name: "Chevrolet Nexia eshigi",
      price: "450,000",
      currency: "so'm",
      image:
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
      views: "Ko'rish",
      description: "Yuqori sifatli avtomobil eshigi. Asl zavod mahsuloti.",
      specifications: {
        Marka: "Chevrolet",
        Model: "Nexia",
        Yil: "2010-2020",
        Rang: "Turli ranglar",
      },
    },
    {
      name: "Mator yog'i 5W-30",
      price: "85,000",
      currency: "so'm",
      image:
        "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=300&fit=crop",
      views: "Ko'rish",
      description: "Yuqori sifatli sintetik motor yog'i.",
      specifications: {
        Hajm: "4L",
        Turi: "Sintetik",
        Viskozlik: "5W-30",
      },
    },
    {
      name: "Tormoz kolodkalari",
      price: "120,000",
      currency: "so'm",
      image:
        "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&h=300&fit=crop",
      views: "Ko'rish",
      description: "Yuqori sifatli tormoz kolodkalari.",
      specifications: {
        Turi: "Keramik",
        Kafolat: "1 yil",
      },
    },
    {
      name: "Akkumulyator 60Ah",
      price: "320,000",
      currency: "so'm",
      image:
        "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop",
      views: "Ko'rish",
      description: "Kuchli avtomobil akkumulyatori.",
      specifications: {
        Quvvat: "60Ah",
        Voltaj: "12V",
        Kafolat: "2 yil",
      },
    },
    {
      name: "Shinalar 195/65 R15",
      price: "280,000",
      currency: "so'm",
      image:
        "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop",
      views: "Ko'rish",
      description: "Yuqori sifatli avtomobil shinalari.",
      specifications: {
        "O'lcham": "195/65 R15",
        Mavsumi: "Yozgi",
      },
    },
    {
      name: "Filtr to'plami",
      price: "65,000",
      currency: "so'm",
      image:
        "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=300&fit=crop",
      views: "Ko'rish",
      description: "Havo, yoqilg'i va yog' filtrlari to'plami.",
      specifications: {
        Miqdor: "3 dona",
        Turi: "Asl",
      },
    },
  ];

  try {
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log("Products seeded successfully");
  } catch (error) {
    console.error("Error seeding products:", error);
  }
};

const seedProfessionals = async () => {
  const professionals = [
    {
      name: "Bobur Karimov",
      phone: "+998 91 877 77 11",
      image:
        "https://images.unsplash.com/photo-1581092795442-8d2c4c5b7e8b?w=400&h=300&fit=crop",
      specialty: "Motor ustasi",
      category: "Elektrik 12V/24V",
      workingHours: "8 dan 18 gacha",
      rating: 4.8,
      experience: "7+ yil",
      services: ["Motor ta'mirlash", "Elektr tizimi", "Diagnostika"],
      reviews: [
        {
          id: "1",
          name: "Aziz Rahimov",
          rating: 5,
          comment: "Juda yaxshi usta, tez va sifatli ish qiladi",
          date: "2024-01-15",
        },
      ],
    },
    {
      name: "Sardor Aliyev",
      phone: "+998 90 123 45 67",
      image:
        "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=400&h=300&fit=crop",
      specialty: "Elektrik ustasi",
      category: "Elektrik 12V",
      workingHours: "9 dan 17 gacha",
      rating: 4.9,
      experience: "5+ yil",
      services: ["Elektr tizimi", "Konditsioner", "Signalizatsiya"],
      reviews: [],
    },
    {
      name: "Jasur Toshmatov",
      phone: "+998 93 987 65 43",
      image:
        "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400&h=300&fit=crop",
      specialty: "Tormoz ustasi",
      category: "Tormoz tizimi",
      workingHours: "8 dan 19 gacha",
      rating: 4.7,
      experience: "6+ yil",
      services: [
        "Tormoz ta'mirlash",
        "Disk almashtirish",
        "Kolodka almashtirish",
      ],
      reviews: [],
    },
    {
      name: "Otabek Nazarov",
      phone: "+998 94 555 66 77",
      image:
        "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=300&fit=crop",
      specialty: "Kuzov ustasi",
      category: "Kuzov ta'mirlash",
      workingHours: "8 dan 18 gacha",
      rating: 4.6,
      experience: "8+ yil",
      services: ["Kuzov ta'mirlash", "Bo'yash", "Detallar almashtirish"],
      reviews: [],
    },
    {
      name: "Farrux Ismoilov",
      phone: "+998 95 111 22 33",
      image:
        "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400&h=300&fit=crop",
      specialty: "Konditsioner ustasi",
      category: "Konditsioner",
      workingHours: "9 dan 18 gacha",
      rating: 4.8,
      experience: "4+ yil",
      services: [
        "Konditsioner ta'mirlash",
        "Freon quyish",
        "Filtr almashtirish",
      ],
      reviews: [],
    },
    {
      name: "Dilshod Umarov",
      phone: "+998 90 456 78 90",
      image:
        "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=400&h=300&fit=crop",
      specialty: "Umumiy ta'mirlash",
      category: "Elektrik 24V",
      workingHours: "8 dan 17 gacha",
      rating: 4.5,
      experience: "10+ yil",
      services: ["Umumiy ta'mirlash", "Diagnostika", "Profilaktika"],
      reviews: [],
    },
  ];

  try {
    await Professional.deleteMany({});
    await Professional.insertMany(professionals);
    console.log("Professionals seeded successfully");
  } catch (error) {
    console.error("Error seeding professionals:", error);
  }
};

const seedDatabase = async () => {
  await connectDB();
  await seedProducts();
  await seedProfessionals();
  console.log("Database seeded successfully");
  process.exit(0);
};

seedDatabase();
