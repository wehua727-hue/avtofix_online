import mongoose from 'mongoose';

const professionalCategorySchema = new mongoose.Schema(
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
      ref: 'ProfessionalCategory',
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
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: "professional_categories",
  }
);

// Virtual for children
professionalCategorySchema.virtual('children', {
  ref: 'ProfessionalCategory',
  localField: '_id',
  foreignField: 'parentId'
});

// Index for efficient querying
professionalCategorySchema.index({ parentId: 1, order: 1 });

// Static method to build category tree
professionalCategorySchema.statics.buildTree = async function(parentId = null, level = 0) {
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
professionalCategorySchema.statics.getDescendants = async function(categoryId) {
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

// Instance method to get full path
professionalCategorySchema.methods.getPath = async function() {
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

if (mongoose.models.ProfessionalCategory) {
  delete mongoose.models.ProfessionalCategory;
}

const ProfessionalCategory = mongoose.model('ProfessionalCategory', professionalCategorySchema);

export default ProfessionalCategory;
