import express from "express";
import Store, { allowedStoreColors } from "../models/Store.js";
import {
  uploadSingleImage,
  processAndStoreImage,
  removeImageByUrl,
} from "../utils/upload.js";

const router = express.Router();


router.get("/", async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    let filter = {};

    // Agar user ID mavjud bo'lsa, user'ni topish
    if (userId) {
      const User = (await import("../models/User.js")).default;
      const user = await User.findById(userId);
      
      // Admin faqat o'zi yaratgan magazinlarni ko'radi
      if (user && user.role === 'admin') {
        filter.createdBy = userId;
      }
      // Xodim faqat o'ziga biriktirilgan magazinni ko'radi
      if (user && user.role === 'xodim' && user.managerOfShop) {
        filter._id = user.managerOfShop;
      }
      // Owner barcha magazinlarni ko'radi (filter bo'sh)
    }

    const stores = await Store.find(filter)
      .populate('createdBy', 'name role') // Qo'shgan odamning nomi va roli
      .populate('manager', 'name role') // Bosh menedjer
      .sort({ createdAt: -1 });
    
    // Har bir magazin uchun mahsulotlar sonini hisoblash (variantlar bilan)
    const Product = (await import("../models/Product.js")).default;
    const storesWithProductCount = await Promise.all(
      stores.map(async (store) => {
        // Asosiy mahsulotlar soni
        const products = await Product.find({ storeId: store._id });
        
        // Variantlar sonini hisoblash
        let totalCount = 0;
        products.forEach(product => {
          // Asosiy mahsulot
          totalCount += 1;
          // Variantlar
          if (Array.isArray(product.variants) && product.variants.length > 0) {
            totalCount += product.variants.length;
          }
        });
        
        return {
          ...store.toObject(),
          productCount: totalCount
        };
      })
    );
    
    res.json(storesWithProductCount);
  } catch (error) {
    console.error("Error fetching stores:", error);
    // MongoDB ulanmasa ham empty array qaytarish
    res.json([]);
  }
});

router.post("/", (req, res) => {
  uploadSingleImage(req, res, async (uploadError) => {
    if (uploadError) {
      console.error("Store image upload error:", uploadError);
      return res
        .status(400)
        .json({ error: uploadError.message || "Rasm yuklashda xatolik" });
    }

    try {
      const { name, location, color = "carbon", createdByUserId, managerUserId } = req.body ?? {};
      const userId = req.headers['x-user-id'];

      if (!userId) {
        return res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
      }

      if (!name || !name.trim() || !location || !location.trim()) {
        return res
          .status(400)
          .json({ error: "Magazin nomi va manzili majburiy" });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ error: "Magazin uchun rasm talab qilinadi" });
      }

      if (color) {
        const isLegacy = allowedStoreColors.includes(color);
        const isHex = /^#([0-9a-fA-F]{6})$/.test(color);
        if (!isLegacy && !isHex) {
          return res.status(400).json({ error: "Tanlangan rang noto'g'ri" });
        }
      }

      // Kim nomidan qo'shilayotganini aniqlash
      const finalCreatedBy = createdByUserId || userId;

      // Admin owner nomidan qo'sha olmaydi
      const User = (await import("../models/User.js")).default;
      const currentUser = await User.findById(userId);
      const targetUser = await User.findById(finalCreatedBy);

      if (currentUser && currentUser.role === 'admin' && targetUser && targetUser.role === 'owner') {
        return res.status(403).json({ error: "Admin owner nomidan magazin qo'sha olmaydi" });
      }

      const uploadDir = req.app.locals.uploadDir;
      const uploadInfo = await processAndStoreImage(
        req.file.buffer,
        req.file.originalname,
        uploadDir,
      );

      const store = await Store.create({
        name: name.trim(),
        location: location.trim(),
        color: color || "carbon",
        imageUrl: uploadInfo.url,
        manager: managerUserId || null,
        createdBy: finalCreatedBy, // Tanlangan foydalanuvchi nomidan
      });

      // Agar manager tanlangan bo'lsa, uning rolini 'manager' ga yangilash (owner bo'lmasa)
      if (managerUserId) {
        const UserModel = (await import("../models/User.js")).default;
        const mgr = await UserModel.findById(managerUserId);
        if (mgr && mgr.role !== 'owner') {
          mgr.role = 'manager';
          mgr.managerOfShop = store._id;
          await mgr.save();
        }
      }

      res.status(201).json(store);
    } catch (error) {
      console.error("Error creating store:", error);
      res.status(500).json({ error: "Magazin qo'shishda xatolik yuz berdi" });
    }
  });
});

router.get("/:id", async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)
      .populate('createdBy', 'name role')
      .populate('manager', 'name role');
    if (!store) {
      return res.status(404).json({ error: "Magazin topilmadi" });
    }
    res.json(store);
  } catch (error) {
    console.error("Error fetching store:", error);
    res.status(500).json({ error: "Magazinni olishda xatolik yuz berdi" });
  }
});

router.put("/:id", (req, res) => {
  uploadSingleImage(req, res, async (uploadError) => {
    if (uploadError) {
      console.error("Store image upload error:", uploadError);
      return res
        .status(400)
        .json({ error: uploadError.message || "Rasm yuklashda xatolik" });
    }

    try {
      const { name, location, color, managerUserId, postUserId } = req.body ?? {};
      const userId = req.headers['x-user-id'];

      if (!userId) {
        return res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
      }

      // Magazinni topish
      const previousStore = await Store.findById(req.params.id);
      if (!previousStore) {
        return res.status(404).json({ error: "Magazin topilmadi" });
      }

      // User rolini tekshirish
      const User = (await import("../models/User.js")).default;
      const user = await User.findById(userId);
      
      // Admin faqat o'zi yaratgan magazinni o'zgartira oladi
      if (user && user.role === 'admin' && previousStore.createdBy.toString() !== userId) {
        return res.status(403).json({ error: "Siz faqat o'zingiz yaratgan magazinni o'zgartira olasiz" });
      }

      const updatePayload = {};

      if (name !== undefined) {
        if (!name || !name.trim()) {
          return res
            .status(400)
            .json({ error: "Magazin nomi bo'sh bo'lishi mumkin emas" });
        }
        updatePayload.name = name.trim();
      }

      if (location !== undefined) {
        if (!location || !location.trim()) {
          return res
            .status(400)
            .json({ error: "Magazin manzili bo'sh bo'lishi mumkin emas" });
        }
        updatePayload.location = location.trim();
      }

      if (color !== undefined) {
        const isLegacy = allowedStoreColors.includes(color);
        const isHex = /^#([0-9a-fA-F]{6})$/.test(color);
        if (!isLegacy && !isHex) {
          return res.status(400).json({ error: "Tanlangan rang noto'g'ri" });
        }
        updatePayload.color = color;
      }

      if (managerUserId !== undefined) {
        // Manager mavjudligini tekshirish va rolini yangilash
        const UserModel = (await import("../models/User.js")).default;
        const managerExists = await UserModel.findById(managerUserId);
        if (!managerExists) {
          return res.status(400).json({ error: "Menedjer topilmadi" });
        }
        if (managerExists.role !== 'owner') {
          managerExists.role = 'manager';
          managerExists.managerOfShop = req.params.id;
          await managerExists.save();
        }
        updatePayload.manager = managerUserId;

        // Avvalgi manager uchun managerOfShop ni tozalash
        if (previousStore.manager) {
          const previousManager = await UserModel.findById(previousStore.manager);
          if (previousManager) {
            previousManager.managerOfShop = null;
            await previousManager.save();
          }
        }
      }

      // POST tizim kategoriyalari uchun user ID
      if (postUserId !== undefined) {
        updatePayload.postUserId = postUserId ? postUserId.trim() : null;
      }

      if (req.file) {
        const uploadDir = req.app.locals.uploadDir;
        const uploadInfo = await processAndStoreImage(
          req.file.buffer,
          req.file.originalname,
          uploadDir,
        );
        await removeImageByUrl(previousStore.imageUrl, uploadDir);
        updatePayload.imageUrl = uploadInfo.url;
      }

      const updatedStore = await Store.findByIdAndUpdate(
        req.params.id,
        updatePayload,
        {
          new: true,
          runValidators: true,
        },
      );

      if (!updatedStore) {
        return res.status(404).json({ error: "Magazin topilmadi" });
      }

      res.json(updatedStore);
    } catch (error) {
      console.error("Error updating store:", error);
      res
        .status(500)
        .json({ error: "Magazinni yangilashda xatolik yuz berdi" });
    }
  });
});

// Toggle store visibility
router.patch("/:id/visibility", async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { isVisible } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
    }

    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ error: "Magazin topilmadi" });
    }

    // User rolini tekshirish
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId);
    
    // Admin faqat o'zi yaratgan magazinni o'zgartira oladi
    if (user && user.role === 'admin' && store.createdBy && store.createdBy.toString() !== userId) {
      return res.status(403).json({ error: "Siz faqat o'zingiz yaratgan magazinni o'zgartira olasiz" });
    }

    // findByIdAndUpdate ishlatamiz - validation skip qiladi
    const updatedStore = await Store.findByIdAndUpdate(
      req.params.id,
      { isVisible },
      { new: true }
    );

    res.json(updatedStore);
  } catch (error) {
    console.error("Error toggling store visibility:", error);
    res.status(500).json({ error: "Magazin ko'rinishini o'zgartirishda xatolik" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
    }

    // Magazinni topish
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ error: "Magazin topilmadi" });
    }

    // User rolini tekshirish
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId);
    
    // Admin faqat o'zi yaratgan magazinni o'chira oladi
    if (user && user.role === 'admin' && store.createdBy.toString() !== userId) {
      return res.status(403).json({ error: "Siz faqat o'zingiz yaratgan magazinni o'chira olasiz" });
    }

    // Magazinga tegishli barcha mahsulotlarni topish
    const Product = (await import("../models/Product.js")).default;
    const storeProducts = await Product.find({ store: req.params.id });

    // Barcha mahsulot rasmlarini o'chirish
    const uploadDir = req.app.locals.uploadDir;
    for (const product of storeProducts) {
      if (product.imageUrl) {
        await removeImageByUrl(product.imageUrl, uploadDir);
      }
      // Agar qo'shimcha rasmlar bo'lsa
      if (Array.isArray(product.images)) {
        for (const imageUrl of product.images) {
          if (imageUrl) {
            await removeImageByUrl(imageUrl, uploadDir);
          }
        }
      }
    }

    // Barcha mahsulotlarni o'chirish
    await Product.deleteMany({ store: req.params.id });

    // Magazin manager'ini (xodimni) o'chirish - POST tizimdan ham o'chadi
    let deletedManagerId = null;
    let deletedManagerPhone = null;
    if (store.manager) {
      const manager = await User.findById(store.manager);
      if (manager && manager.role === 'manager') {
        deletedManagerId = store.manager;
        deletedManagerPhone = manager.phone;
        // Manager'ni o'chirish (marketplace_users collection'idan - POST tizim ham shu collection'dan foydalanadi)
        await User.findByIdAndDelete(store.manager);
        console.log(`Manager ${store.manager} (tel: ${manager.phone}) o'chirildi (magazin bilan birga)`);
      }
    }

    // Shu magazinga bog'langan barcha helper'larni ham o'chirish
    const helpers = await User.find({ 
      role: 'helper', 
      managerOfShop: req.params.id 
    });
    const deletedHelperIds = [];
    for (const helper of helpers) {
      deletedHelperIds.push(helper._id);
      await User.findByIdAndDelete(helper._id);
      console.log(`Helper ${helper._id} (tel: ${helper.phone}) o'chirildi (magazin bilan birga)`);
    }

    // Magazinni o'chirish
    const deletedStore = await Store.findByIdAndDelete(req.params.id);
    await removeImageByUrl(deletedStore.imageUrl, uploadDir);

    res.json({ 
      success: true, 
      deletedProductsCount: storeProducts.length,
      deletedManagerId: deletedManagerId,
      deletedManagerPhone: deletedManagerPhone,
      deletedHelpersCount: helpers.length,
      deletedHelperIds: deletedHelperIds,
      message: `Magazin, ${storeProducts.length} ta mahsulot, ${deletedManagerId ? '1 ta manager' : '0 ta manager'} va ${helpers.length} ta helper o'chirildi`
    });
  } catch (error) {
    console.error("Error deleting store:", error);
    res.status(500).json({ error: "Magazinni o'chirishda xatolik yuz berdi" });
  }
});

export default router;
