import mongoose from "mongoose";

const carBrandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    // Kim qo'shgan
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Necha marta tanlangan
    usageCount: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Qidiruv uchun index
carBrandSchema.index({ name: 1 });
carBrandSchema.index({ usageCount: -1 });

export default mongoose.models.CarBrand || mongoose.model("CarBrand", carBrandSchema);
