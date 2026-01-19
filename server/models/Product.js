import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    trim: true,
    default: null
  },
  catalogNumber: {
    type: String,
    trim: true,
    default: null
  },
  sku: {
    type: String,
    trim: true,
    default: null
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Hozircha optional (keyinchalik required qilamiz)
  },
  price: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    default: 'UZS'
  },
  originalPrice: {
    type: String,
    default: null
  },
  markupPercent: {
    type: Number,
    default: null
  },
  condition: {
    type: String,
    enum: ['new', 'used', 'refurbished'],
    default: 'new'
  },
  imageUrl: {
    type: String,
    required: false,
    trim: true,
    default: null,
  },
  images: [
    {
      type: String,
      trim: true,
    },
  ],
  imagePaths: [
    {
      type: String,
      trim: true,
    },
  ],
  views: {
    type: String,
    default: 'Ko\'rish'
  },
  description: {
    type: String,
    default: ''
  },
  specifications: {
    type: Map,
    of: String,
    default: {}
  },
  categoryId: {
    type: String, // String sifatida saqlash (MongoDB'da string sifatida saqlangan)
    default: null,
  },
  category: {
    type: String,
    default: 'Ehtiyot qismlar'
  },
  stockCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  inStock: {
    type: Boolean,
    default: true
  },
  variants: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  variantSummaries: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  sizes: {
    type: [String],
    default: []
  },
  userId: {
    type: String,
    default: null
  },
  parentProductId: {
    type: String,
    default: null
  },
  isVariant: {
    type: Boolean,
    default: false
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  stock: {
    type: Number,
    default: 0
  },
  quantity: {
    type: Number,
    default: 0
  },
  // Qo'shimcha stok maydonlari (import qilingan ma'lumotlar uchun)
  qty: { type: Number, default: 0 },
  count: { type: Number, default: 0 },
  available: { type: Number, default: 0 },
  stock_quantity: { type: Number, default: 0 },
  availableQuantity: { type: Number, default: 0 },
  status: {
    type: String,
    default: 'available'
  },
  basePrice: {
    type: Number,
    default: null
  },
  priceMultiplier: {
    type: Number,
    default: null
  },
  originalPriceString: {
    type: String,
    default: null
  },
  originalBasePriceString: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: "products",
});

// Индексы для оптимизации запросов
productSchema.index({ userId: 1, store: 1, isHidden: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ store: 1 });
productSchema.index({ createdBy: 1 });
productSchema.index({ categoryId: 1 }); // Kategoriya bo'yicha filter
productSchema.index({ name: 'text', description: 'text', category: 'text' }); // Текстовый поиск

// Удаляем модель из кэша, если она существует, чтобы применить новую коллекцию
if (mongoose.models.Product) {
  delete mongoose.models.Product;
}

export default mongoose.model('Product', productSchema);
