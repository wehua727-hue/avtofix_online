import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    filename: { type: String, trim: true },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true },
    size: { type: Number },
  },
  { timestamps: true }
);

// Helpful indexes for faster retrieval/sorting
imageSchema.index({ createdAt: -1 });
imageSchema.index({ filename: 1 }, { sparse: true });

export default mongoose.models.Image || mongoose.model("Image", imageSchema);
