import express from "express";
import mongoose from "mongoose";
const router = express.Router();

// Cart schema
const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    items: [
      {
        productId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        currency: {
          type: String,
          default: "UZS",
        },
        image: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        variantName: {
          type: String,
          default: null,
        },
        parentProductId: {
          type: String,
          default: null,
        },
        stockCount: {
          type: Number,
          default: null,
        },
      },
    ],
    total: {
      type: Number,
      default: 0,
    },
    itemCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Calculate totals before saving
cartSchema.pre("save", function (next) {
  this.total = this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  this.itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
  next();
});

const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

// Get user's cart
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }

    res.json(cart);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Savatni yuklashda xatolik" });
  }
});

// Add item to cart
router.post("/:userId/add", async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, name, price, currency = "UZS", image, quantity = 1, variantName = null, parentProductId = null, stockCount = null } = req.body;

    if (!productId || !name || !price || !image) {
      return res
        .status(400)
        .json({ error: "Mahsulot ma'lumotlari to'liq emas" });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId === productId,
    );

    if (existingItemIndex > -1) {
      // Ombordagi miqdordan ko'p bo'lmasin
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      const itemStockCount = cart.items[existingItemIndex].stockCount;
      if (itemStockCount !== null && newQuantity > itemStockCount) {
        return res.status(400).json({ error: `Omborda faqat ${itemStockCount} ta mavjud` });
      }
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      cart.items.push({
        productId,
        name,
        price,
        currency,
        image,
        quantity,
        variantName,
        parentProductId,
        stockCount,
      });
    }

    await cart.save();
    res.json(cart);
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ error: "Savatga qo'shishda xatolik" });
  }
});

// Update item quantity
router.put("/:userId/update", async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, quantity } = req.body;

    if (!productId || quantity < 0) {
      return res.status(400).json({ error: "Noto'g'ri ma'lumotlar" });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ error: "Savatcha topilmadi" });
    }

    if (quantity === 0) {
      cart.items = cart.items.filter((item) => item.productId !== productId);
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.productId === productId,
      );
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity = quantity;
      }
    }

    await cart.save();
    res.json(cart);
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ error: "Savatni yangilashda xatolik" });
  }
});

// Remove item from cart
router.delete("/:userId/remove/:productId", async (req, res) => {
  try {
    const { userId, productId } = req.params;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ error: "Savatcha topilmadi" });
    }

    cart.items = cart.items.filter((item) => item.productId !== productId);
    await cart.save();

    res.json(cart);
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ error: "Savatdan o'chirishda xatolik" });
  }
});

// Clear cart
router.delete("/:userId/clear", async (req, res) => {
  try {
    const { userId } = req.params;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ error: "Savatcha topilmadi" });
    }

    cart.items = [];
    await cart.save();

    res.json(cart);
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({ error: "Savatni tozalashda xatolik" });
  }
});

export default router;
