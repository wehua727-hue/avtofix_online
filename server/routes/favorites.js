import express from "express";
import Favorite from "../models/Favorite.js";

const router = express.Router();

const ensureFavoritesDocument = async (userId) => {
  let favorites = await Favorite.findOne({ userId });
  if (!favorites) {
    favorites = new Favorite({ userId, items: [] });
    await favorites.save();
  }
  return favorites;
};

const mapItemForResponse = (item) => ({
  id: item.productId,
  name: item.name ?? "",
  price: item.price ?? "",
  currency: item.currency ?? "",
  image: item.image ?? "",
});

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ error: "Foydalanuvchi identifikatori talab qilinadi" });
    }

    const favorites = await ensureFavoritesDocument(userId);
    const items = favorites.items.map(mapItemForResponse);

    return res.json({ items });
  } catch (error) {
    console.error("Favorite fetch error:", error);
    return res.status(500).json({ error: "Sevimlilarni yuklashda xatolik" });
  }
});

router.post("/:userId/toggle", async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, name, price, currency, image } = req.body;

    if (!userId || !productId || !name) {
      return res
        .status(400)
        .json({ error: "Sevimlilar uchun ma'lumotlar to'liq emas" });
    }

    const favorites = await ensureFavoritesDocument(userId);
    const existingIndex = favorites.items.findIndex(
      (item) => item.productId === productId,
    );

    let isFavorite;
    if (existingIndex > -1) {
      favorites.items.splice(existingIndex, 1);
      isFavorite = false;
    } else {
      favorites.items.unshift({
        productId,
        name,
        price,
        currency,
        image,
      });
      isFavorite = true;
    }

    await favorites.save();
    const items = favorites.items.map(mapItemForResponse);

    return res.json({ items, isFavorite });
  } catch (error) {
    console.error("Favorite toggle error:", error);
    return res.status(500).json({ error: "Sevimlilarni yangilashda xatolik" });
  }
});

router.delete("/:userId/remove/:productId", async (req, res) => {
  try {
    const { userId, productId } = req.params;

    if (!userId || !productId) {
      return res
        .status(400)
        .json({
          error: "Sevimlilarni o'chirish uchun ma'lumotlar to'liq emas",
        });
    }

    const favorites = await ensureFavoritesDocument(userId);
    favorites.items = favorites.items.filter(
      (item) => item.productId !== productId,
    );
    await favorites.save();

    const items = favorites.items.map(mapItemForResponse);

    return res.json({ items });
  } catch (error) {
    console.error("Favorite remove error:", error);
    return res.status(500).json({ error: "Sevimlilarni o'chirishda xatolik" });
  }
});

export default router;
