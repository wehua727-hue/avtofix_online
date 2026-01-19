import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Store from "../models/Store.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    const safeUsers = users.map((user) => {
      const { password: _password, __v, ...userData } = user.toObject();
      const formatted = {
        ...userData,
        id: userData._id.toString(),
      };
      delete formatted._id;
      return formatted;
    });

    return res.json(safeUsers);
  } catch (error) {
    console.error("Fetch users error:", error);
    return res.status(500).json({ error: "Foydalanuvchilarni olishda xatolik" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, phone, address, password, latitude, longitude, cars } = req.body;

    // Debug: Log incoming data
    console.log("=== REGISTER REQUEST ===");
    console.log("Name:", name);
    console.log("Phone:", phone);
    console.log("Address:", address);
    console.log("Latitude:", latitude);
    console.log("Longitude:", longitude);
    console.log("Cars:", cars);

    // Validate required fields (address endi ixtiyoriy)
    if (!name || !phone || !password) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ error: "Ism, telefon va parol majburiy" });
    }

    // Validate phone number format (should be 9 digits)
    if (!/^\d{9}$/.test(phone)) {
      console.log("❌ Invalid phone format:", phone);
      return res.status(400).json({ error: "Telefon raqam 9 ta raqamdan iborat bo'lishi kerak" });
    }

    // Validate password length
    if (password.length < 6) {
      console.log("❌ Password too short");
      return res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
    }

    // Check if user already exists
    console.log("Checking for existing user with phone:", phone);
    const existingUser = await User.findOne({ phone });
    
    if (existingUser) {
      console.log("❌ User already exists:", {
        id: existingUser._id,
        name: existingUser.name,
        phone: existingUser.phone
      });
      return res
        .status(409)
        .json({ error: "Bu telefon raqam bilan ro'yxatdan o'tilgan" });
    }
    
    console.log("✅ Phone number is available");

    // Hash password
    console.log("Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    console.log("Creating user...");
    const user = await User.create({
      name: name.trim(),
      phone: phone.trim(),
      address: address ? address.trim() : "",
      password: hashedPassword,
      role: "user",
      latitude: latitude || null,
      longitude: longitude || null,
      cars: Array.isArray(cars) ? cars.filter(c => c && c.trim()) : [],
    });

    console.log("✅ User created successfully:", {
      id: user._id,
      name: user.name,
      phone: user.phone,
      cars: user.cars
    });

    // Return safe user data
    const { password: _, __v, ...userData } = user.toObject();
    const safeUser = {
      ...userData,
      id: userData._id.toString(),
    };
    delete safeUser._id;

    return res.status(201).json(safeUser);
  } catch (error) {
    console.error("❌ Register error:", error);
    console.error("Error code:", error.code);
    console.error("Error name:", error.name);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      console.log("Duplicate key error - phone already exists");
      return res.status(409).json({ error: "Bu telefon raqam bilan ro'yxatdan o'tilgan" });
    }
    
    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      console.log("Validation error:", messages);
      return res.status(400).json({ error: messages.join(", ") });
    }
    
    return res.status(500).json({ error: "Ro'yxatdan o'tishda xatolik yuz berdi" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Validate required fields
    if (!phone || !password) {
      return res
        .status(400)
        .json({ error: "Telefon raqam va parol talab qilinadi" });
    }

    // Validate phone number format
    if (!/^\d{9}$/.test(phone)) {
      return res.status(400).json({ error: "Telefon raqam formati noto'g'ri" });
    }

    // Find user by phone
    const user = await User.findOne({ phone: phone.trim() });
    if (!user) {
      return res
        .status(401)
        .json({ error: "Noto'g'ri telefon raqam yoki parol" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ error: "Noto'g'ri telefon raqam yoki parol" });
    }

    // Main owner check: 775236984 doim owner bo'lishi kerak
    if (phone === '775236984' && user.role !== 'owner') {
      console.log('🔒 Main owner detected, updating role to owner');
      user.role = 'owner';
      await user.save();
    }

    // Return safe user data
    const { password: _, __v, ...userData } = user.toObject();
    const safeUser = {
      ...userData,
      id: userData._id.toString(),
    };
    delete safeUser._id;

    return res.json(safeUser);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Kirishda xatolik yuz berdi" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ error: "Foydalanuvchi identifikatori talab qilinadi" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    const { password: _, __v, ...userData } = user.toObject();
    const safeUser = {
      ...userData,
      id: userData._id.toString(),
    };
    delete safeUser._id;

    return res.json(safeUser);
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      address,
      currentPassword,
      newPassword,
    } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    if (!name || !phone || !address) {
      return res
        .status(400)
        .json({ error: "Majburiy maydonlar to'ldirilishi kerak" });
    }

    if (phone !== user.phone) {
      const existingUser = await User.findOne({ phone });
      if (existingUser && existingUser._id.toString() !== id) {
        return res
          .status(409)
          .json({
            error:
              "Bu telefon raqam boshqa foydalanuvchi tomonidan ishlatilmoqda",
          });
      }
    }

    if (newPassword) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({
            error: "Yangi parolni o'rnatish uchun hozirgi parolni kiriting",
          });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Hozirgi parol noto'g'ri" });
      }

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    user.name = name;
    user.phone = phone;
    user.address = address;

    await user.save();

    const { password: _, __v, ...userData } = user.toObject();
    const safeUser = {
      ...userData,
      id: userData._id.toString(),
    };
    delete safeUser._id;

    return res.json(safeUser);
  } catch (error) {
    console.error("User update error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const requestingUserId = req.headers['x-user-id'];

    if (!role || !["user", "admin", "owner", "manager", "helper", "xodim"].includes(role)) {
      return res.status(400).json({ error: "Yaroqli rol tanlanishi kerak" });
    }

    // Get requesting user
    const requestingUser = requestingUserId ? await User.findById(requestingUserId) : null;
    
    if (!requestingUser) {
      return res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    // Admin owner yarata olmaydi
    if (requestingUser.role === 'admin' && role === 'owner') {
      return res.status(403).json({ error: "Siz adminsiz, owner qo'sha olmaysiz. Faqat owner boshqa owner qo'sha oladi." });
    }

    // Admin owner'ning rolini o'zgartira olmaydi
    if (requestingUser.role === 'admin' && user.role === 'owner') {
      return res.status(403).json({ error: "Siz owner'ning ma'lumotlarini o'zgartira olmaysiz. Faqat owner boshqa owner'ni o'zgartira oladi." });
    }

    if (user.role === role) {
      const { password: _password, __v, ...userData } = user.toObject();
      const safeUser = { ...userData, id: userData._id.toString() };
      delete safeUser._id;
      return res.json(safeUser);
    }

    // Xodim roliga o'zgartirilganda magazin biriktirish majburiy emas (frontend'dan keyinroq biriktiriladi)
    user.role = role;
    // Agar xodim bo'lsa va managerOfShop bo'sh bo'lsa, uni tozalash (yangi magazin biriktiriladi)
    if (role === 'xodim' && !user.managerOfShop) {
      // Frontend'dan storeId keladi, lekin bu yerda faqat rol yangilanadi
    }
    await user.save();

    const { password: _password, __v, ...userData } = user.toObject();
    const safeUser = {
      ...userData,
      id: userData._id.toString(),
    };
    delete safeUser._id;

    return res.json(safeUser);
  } catch (error) {
    console.error("User role update error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Xodimga magazin biriktirish
router.patch("/:id/assign-store", async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId } = req.body;
    const requestingUserId = req.headers['x-user-id'];

    if (!requestingUserId) {
      return res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
    }

    const requestingUser = await User.findById(requestingUserId);
    if (!requestingUser) {
      return res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
    }

    // Faqat owner, admin yoki manager magazin biriktira oladi
    if (!['owner', 'admin', 'manager'].includes(requestingUser.role)) {
      return res.status(403).json({ error: "Magazin biriktirish uchun ruxsat yo'q" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    // Xodim bo'lishi kerak
    if (user.role !== 'xodim') {
      return res.status(400).json({ error: "Bu foydalanuvchi xodim emas" });
    }

    // Store mavjudligini tekshirish
    if (storeId) {
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({ error: "Magazin topilmadi" });
      }
    }

    user.managerOfShop = storeId || null;
    await user.save();

    const { password: _password, __v, ...userData } = user.toObject();
    const safeUser = {
      ...userData,
      id: userData._id.toString(),
    };
    delete safeUser._id;

    return res.json(safeUser);
  } catch (error) {
    console.error("Assign store error:", error);
    return res.status(500).json({ error: "Magazin biriktirishda xatolik" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Foydalanuvchi identifikatori talab qilinadi" });
    }

    // Requesting user (who performs deletion)
    const requestingUserId = req.headers['x-user-id'];
    const requestingUser = requestingUserId ? await User.findById(requestingUserId) : null;

    if (!requestingUser) {
      return res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    // Nobody can delete themselves, regardless of role
    if (requestingUserId === id) {
      return res.status(403).json({ error: "Foydalanuvchi o'zini o'chira olmaydi" });
    }

    // Admin cannot delete owner
    if (requestingUser.role === 'admin' && user.role === 'owner') {
      return res.status(403).json({ error: "Siz adminsiz, owner'ni o'chira olmaysiz. Faqat owner boshqa owner'ni o'chira oladi." });
    }

    await user.deleteOne();

    return res.json({ success: true });
  } catch (error) {
    console.error("User delete error:", error);
    return res.status(500).json({ error: "Foydalanuvchini o'chirishda xatolik" });
  }
});

export default router;
