import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Kategoriya nomi kiritilishi shart'],
      trim: true,
      minlength: [2, 'Kategoriya nomi kamida 2 ta belgidan iborat bo\'lishi kerak'],
      maxlength: [100, 'Kategoriya nomi 100 ta belgidan oshmasligi kerak']
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'categories',
      default: null,
      index: true
    },
    order: {
      type: Number,
      default: 0,
      index: true
    },
    level: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Tavsif 500 ta belgidan oshmasligi kerak']
    },
    icon: {
      type: String,
      trim: true
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: "categories",
  }
);

// Virtual for children
categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId'
});

// Index for efficient querying
categorySchema.index({ parentId: 1, order: 1 });
categorySchema.index({ slug: 1 }, { unique: true, sparse: true });

// Pre-save hook to generate unique slug
categorySchema.pre('save', async function(next) {
  if (this.isModified('name') && !this.slug) {
    let baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    // Ensure slug is unique
    let slug = baseSlug;
    let counter = 1;
    const CategoryModel = this.constructor;
    
    while (true) {
      const existing = await CategoryModel.findOne({ 
        slug,
        _id: { $ne: this._id } // Exclude current document when updating
      });
      
      if (!existing) {
        break;
      }
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

// Static method to build category tree
categorySchema.statics.buildTree = async function(parentId = null, level = 0) {
  const categories = await this.find({ parentId, isActive: true })
    .sort({ order: 1, name: 1 })
    .lean();

  const tree = [];
  for (const category of categories) {
    const node = {
      ...category,
      level,
      children: await this.buildTree(category._id, level + 1)
    };
    tree.push(node);
  }

  return tree;
};

// Static method to get all descendants
categorySchema.statics.getDescendants = async function(categoryId) {
  const descendants = [];
  const queue = [categoryId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = await this.find({ parentId: currentId }).lean();
    
    for (const child of children) {
      descendants.push(child._id);
      queue.push(child._id);
    }
  }

  return descendants;
};

// Static method to update level for category and descendants
categorySchema.statics.updateLevels = async function(categoryId, newLevel) {
  await this.updateOne({ _id: categoryId }, { level: newLevel });
  
  const children = await this.find({ parentId: categoryId });
  for (const child of children) {
    await this.updateLevels(child._id, newLevel + 1);
  }
};

// Instance method to get full path
categorySchema.methods.getPath = async function() {
  const path = [this.name];
  let current = this;

  while (current.parentId) {
    current = await this.constructor.findById(current.parentId);
    if (current) {
      path.unshift(current.name);
    } else {
      break;
    }
  }

  return path.join(' > ');
};

// Удаляем модель из кэша, если она существует, чтобы применить новую коллекцию
if (mongoose.models.Category) {
  delete mongoose.models.Category;
}

const Category = mongoose.model('Category', categorySchema);

export default Category;
