import mongoose from "mongoose";

export const allowedStoreColors = [
  "carbon",
  "graphite",
  "iron",
  "ash",
  "crimson",
  "scarlet",
];

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    imageUrl: {
      type: String,
      trim: true,
      required: true,
    },
    color: {
      type: String,
      trim: true,
      default: "carbon",
      validate: {
        validator: function (v) {
          if (!v) return true;
          const isLegacy = allowedStoreColors.includes(v);
          const isHex = /^#([0-9a-fA-F]{6})$/.test(v);
          return isLegacy || isHex;
        },
        message: "Tanlangan rang noto'g'ri",
      },
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Hozircha optional (keyinchalik required qilamiz)
    },
    // POST tizimdagi kategoriyalar uchun user ID (agar boshqa bo'lsa)
    postUserId: {
      type: String,
      trim: true,
      default: null,
    },
    isVisible: {
      type: Boolean,
      default: true, // Default: ko'rinadi
    },
  },
  {
    timestamps: true,
    collection: "stores",
  }
);

// Удаляем модель из кэша, если она существует, чтобы применить новую коллекцию
if (mongoose.models.Store) {
  delete mongoose.models.Store;
}

const Store = mongoose.model("Store", storeSchema);

export default Store;
