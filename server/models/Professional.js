import mongoose from "mongoose";

const professionalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    images: [
      {
        type: String,
      },
    ],
    specialty: {
      type: String,
      default: "Motor ustasi",
    },
    specialties: [
      {
        type: String,
      },
    ],
    category: {
      type: String,
      default: "Elektrik 12V/24V",
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProfessionalCategory",
      default: null,
      index: true,
    },
    workingHours: {
      type: String,
      default: "8 dan 18 gacha",
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    experience: {
      type: String,
      default: "5+ yil",
    },
    services: [
      {
        type: String,
      },
    ],
    reviews: [
      {
        id: String,
        name: String,
        rating: Number,
        comment: String,
        date: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    // Геолокация
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    region: {
      type: String,
      default: "",
    },
    district: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// Индексы для оптимизации запросов
professionalSchema.index({ isActive: 1, createdAt: -1 });
professionalSchema.index({ createdBy: 1 });

export default mongoose.models.Professional || mongoose.model("Professional", professionalSchema);
