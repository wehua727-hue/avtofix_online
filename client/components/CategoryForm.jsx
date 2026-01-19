import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

/**
 * Reusable form component for creating/editing categories
 */
const CategoryForm = ({ 
  category = null, 
  parentCategory = null,
  allCategories = [],
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: null,
    order: 0
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (category) {
      // Edit mode
      setFormData({
        name: category.name || '',
        description: category.description || '',
        parentId: category.parentId || null,
        order: category.order || 0
      });
    } else if (parentCategory) {
      // Add child mode
      setFormData(prev => ({
        ...prev,
        parentId: parentCategory._id
      }));
    }
  }, [category, parentCategory]);

  const validate = () => {
    const newErrors = {};

    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Kategoriya nomi kiritilishi shart';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Kategoriya nomi kamida 2 ta belgidan iborat bo\'lishi kerak';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Kategoriya nomi 100 ta belgidan oshmasligi kerak';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Tavsif 500 ta belgidan oshmasligi kerak';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    const submitData = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined
    };

    onSubmit(submitData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Build flat list of categories for parent selector (excluding current and descendants)
  const buildFlatList = (cats, excludeId = null, level = 0) => {
    let result = [];
    for (const cat of cats) {
      if (cat._id !== excludeId) {
        result.push({ ...cat, level });
        if (cat.children && cat.children.length > 0) {
          result = result.concat(buildFlatList(cat.children, excludeId, level + 1));
        }
      }
    }
    return result;
  };

  const flatCategories = buildFlatList(allCategories, category?._id);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Category Name */}
      <div className="space-y-2">
        <Label htmlFor="category-name" className="text-sm text-gray-300">
          Kategoriya nomi *
        </Label>
        <Input
          id="category-name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Masalan: Ehtiyot qismlar"
          className="bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-500"
          autoFocus
        />
        {errors.name && (
          <p className="text-xs text-red-500">{errors.name}</p>
        )}
      </div>

      {/* Parent Category */}
      <div className="space-y-2">
        <Label htmlFor="category-parent" className="text-sm text-gray-300">
          Ota kategoriya (ixtiyoriy)
        </Label>
        <select
          id="category-parent"
          value={formData.parentId || ''}
          onChange={(e) => handleChange('parentId', e.target.value || null)}
          className="w-full rounded-xl border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-red-600"
          disabled={!!parentCategory}
        >
          <option value="">Ota kategoriya yo'q (yuqori daraja)</option>
          {flatCategories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {'—'.repeat(cat.level)} {cat.name}
            </option>
          ))}
        </select>
        {parentCategory && (
          <p className="text-xs text-gray-400">
            Ota kategoriya: <span className="text-gray-200">{parentCategory.name}</span>
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="category-description" className="text-sm text-gray-300">
          Tavsif (ixtiyoriy)
        </Label>
        <textarea
          id="category-description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Kategoriya haqida qisqa tavsif"
          className="min-h-[80px] w-full resize-none rounded-xl border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-red-600"
          maxLength={500}
        />
        {errors.description && (
          <p className="text-xs text-red-500">{errors.description}</p>
        )}
        <p className="text-xs text-gray-500">
          {formData.description.length}/500
        </p>
      </div>

      {/* Order */}
      <div className="space-y-2">
        <Label htmlFor="category-order" className="text-sm text-gray-300">
          Tartib raqami
        </Label>
        <Input
          id="category-order"
          type="number"
          min="0"
          step="1"
          value={formData.order}
          onChange={(e) => handleChange('order', parseInt(e.target.value) || 0)}
          className="bg-gray-800 border-gray-700 text-gray-200"
        />
        <p className="text-xs text-gray-500">
          Kichik raqam birinchi ko'rsatiladi
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
        >
          {category ? 'Saqlash' : 'Qo\'shish'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-gray-600 bg-gray-850 text-gray-300 hover:bg-gray-700"
        >
          Bekor qilish
        </Button>
      </div>
    </form>
  );
};

export default CategoryForm;
