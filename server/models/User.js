import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    // GPS koordinatalari
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    // Foydalanuvchi mashinalari
    cars: [
      {
        type: String,
        trim: true,
      },
    ],
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["user", "admin", "owner", "manager", "helper", "xodim"],
      default: "user",
    },
    managerOfShop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null,
    },
    helperPermissions: {
      products: { type: Boolean, default: false },
      orders: { type: Boolean, default: false },
      helpers: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    collection: "marketplace_users",
  },
);

userSchema.index({ phone: 1 }, { unique: true });

// Удаляем модель из кэша, если она существует, чтобы применить новую коллекцию
if (mongoose.models.User) {
  delete mongoose.models.User;
}

const User = mongoose.model("User", userSchema);

export default User;
