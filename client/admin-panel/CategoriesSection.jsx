import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Trash2, Pencil } from 'lucide-react';
import { categoriesAPI } from '@/services/api';
import InlineAddCategory from '@/components/InlineAddCategory';
import { toast } from 'sonner';

/**
 * Modern Inline Categories Management (Notion-style)
 * Features: Inline add/edit/delete, no modals, smooth animations
 */
const CategoriesSection = ({ storeId }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentParentId, setCurrentParentId] = useState(null);
  const [currentTitle, setCurrentTitle] = useState('Kategoriyalar');
  const [levelsStack, setLevelsStack] = useState([]); // { parentId, title }
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  // Fetch categories for current level
  useEffect(() => {
    fetchCategories(currentParentId);
  }, [currentParentId, storeId]);

  const fetchCategories = async (parentId = null) => {
    try {
      setLoading(true);
      const data = await categoriesAPI.getByParent(parentId, storeId);
      // Сортировка: новые категории вверху (по createdAt или updatedAt, desc)
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.updatedAt || 0);
        const dateB = new Date(b.createdAt || b.updatedAt || 0);
        return dateB - dateA; // Новые вверху
      });
      setCategories(sorted);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error(error.message || 'Kategoriyalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  // Handle create category (inline) - simple approach
  const handleCreate = async (categoryData) => {
    try {
      console.log('Creating category with data:', categoryData);
      
      // Send to server with storeId
      const result = await categoriesAPI.create({ ...categoryData, storeId });
      console.log('Category created:', result);
      
      // Refresh categories from server to get updated tree
      await fetchCategories(currentParentId);
      
      toast.success('Kategoriya qo\'shildi');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error(error.message || 'Kategoriya qo\'shishda xatolik');
      throw error;
    }
  };


  // Start editing category
  const startEditing = (category) => {
    setEditingId(category._id);
    setEditingName(category.name);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  // Handle update category (inline)
  const handleUpdate = async (id) => {
    if (!editingName.trim()) {
      toast.error('Kategoriya nomi bo\'sh bo\'lishi mumkin emas');
      return;
    }
    try {
      await categoriesAPI.update(id, { name: editingName.trim() });
      toast.success('Kategoriya yangilandi');
      setEditingId(null);
      setEditingName('');
      await fetchCategories(currentParentId);
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(error.message || 'Kategoriyani yangilashda xatolik');
      throw error;
    }
  };

  // Handle delete category (inline confirmation)
  const handleDelete = async (id) => {
    try {
      await categoriesAPI.delete(id);
      toast.success('Kategoriya o\'chirildi');
      
      // Save current state before changes
      const savedCurrentParentId = currentParentId;
      const savedCurrentTitle = currentTitle;
      const savedLevelsStack = [...levelsStack];
      
      // Check if deleted category is in navigation stack or is current parent
      const deletedInStack = savedLevelsStack.findIndex(level => level.parentId === id);
      const isCurrentParent = savedCurrentParentId === id;
      
      let newParentId = savedCurrentParentId;
      let newTitle = savedCurrentTitle;
      let newStack = savedLevelsStack;
      
      if (isCurrentParent) {
        // If deleted category is current parent, go back one level
        if (savedLevelsStack.length > 0) {
          const prev = savedLevelsStack[savedLevelsStack.length - 1];
          newStack = savedLevelsStack.slice(0, -1);
          newParentId = prev.parentId;
          newTitle = prev.title;
        } else {
          // Go to root level
          newParentId = null;
          newTitle = 'Kategoriyalar';
          newStack = [];
        }
      } else if (deletedInStack !== -1) {
        // If deleted category is in stack, remove it and all levels after it
        newStack = savedLevelsStack.slice(0, deletedInStack);
        
        // Update current level based on cleaned stack
        if (newStack.length > 0) {
          const lastLevel = newStack[newStack.length - 1];
          newParentId = lastLevel.parentId;
          newTitle = lastLevel.title;
        } else {
          newParentId = null;
          newTitle = 'Kategoriyalar';
        }
      }
      
      // Update state
      setLevelsStack(newStack);
      setCurrentParentId(newParentId);
      setCurrentTitle(newTitle);
      
      // Refresh categories for new level
      await fetchCategories(newParentId);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.message || 'Kategoriyani o\'chirishda xatolik');
      throw error;
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl sm:rounded-2xl">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            {(levelsStack.length > 0 || currentParentId !== null) && (
              <button
                type="button"
                onClick={() => {
                  if (levelsStack.length === 0) {
                    setCurrentParentId(null);
                    setCurrentTitle('Kategoriyalar');
                    return;
                  }
                  const prev = levelsStack[levelsStack.length - 1];
                  const rest = levelsStack.slice(0, -1);
                  setLevelsStack(rest);
                  setCurrentParentId(prev.parentId);
                  setCurrentTitle(prev.title);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:border-rose-500 dark:hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
                aria-label="Orqaga"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <CardTitle className="text-gray-900 dark:text-white text-base sm:text-lg">{currentTitle}</CardTitle>
              <div className="text-gray-500 dark:text-gray-400">
                <div className="mt-2 sm:mt-4 flex flex-wrap items-center gap-1 rounded-full border border-rose-500/60 dark:border-rose-500/60 bg-rose-50 dark:bg-rose-500/5 px-3 sm:px-7 py-1 text-[10px] sm:text-[11px]">
                  {(() => {
                    const titles = [];
                    titles.push('Kategoriyalar');
                    levelsStack.forEach((lvl, idx) => {
                      if (idx === 0 && lvl.title === 'Kategoriyalar') return;
                      if (lvl.title) titles.push(lvl.title);
                    });
                    if (currentTitle && currentTitle !== 'Kategoriyalar') {
                      titles.push(currentTitle);
                    }

                    return titles.map((title, index) => {
                      const isLast = index === titles.length - 1;
                      const common = 'inline-flex items-center';
                      if (isLast) {
                        return (
                          <span
                            key={title + index}
                            className={`${common} text-[12px] font-semibold text-gray-900 dark:text-white`}
                          >
                            {index > 0 && <span className="mx-1 text-gray-500 dark:text-gray-400">/</span>}
                            {title}
                          </span>
                        );
                      }

                      return (
                        <span key={title + index} className={`${common} text-gray-600 dark:text-gray-300`}>
                          {index > 0 && <span className="mx-1 text-gray-400 dark:text-gray-500">/</span>}
                          {title}
                        </span>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-500 animate-spin" />
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-800 space-y-2">
            {/* Current level categories */}
            {categories.length > 0 ? (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category._id}
                    className="flex items-center justify-between rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/70 px-2 sm:px-3 py-2"
                  >
                    {editingId === category._id ? (
                      // Tahrirlash rejimi
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate(category._id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-rose-500"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          onClick={() => handleUpdate(category._id)}
                        >
                          Saqlash
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs"
                          onClick={cancelEditing}
                        >
                          Bekor
                        </Button>
                      </div>
                    ) : (
                      // Oddiy ko'rinish
                      <>
                        <button
                          type="button"
                          className="flex-1 text-left text-sm text-gray-700 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white"
                          onClick={() => {
                            setLevelsStack((prev) => [
                              ...prev,
                              { parentId: currentParentId, title: currentTitle },
                            ]);
                            setCurrentParentId(category._id);
                            setCurrentTitle(category.name);
                          }}
                        >
                          {category.name}
                        </button>
                        <div className="flex items-center gap-2 ml-3">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-full border border-amber-400/60 dark:border-amber-400/60 bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-400/20 hover:text-amber-900 dark:hover:text-white"
                            onClick={() => startEditing(category)}
                            title="Tahrirlash"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-full border border-rose-500/60 dark:border-rose-500/60 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:text-rose-900 dark:hover:text-white"
                            onClick={() => handleDelete(category._id)}
                            title="O'chirish"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                  Bu darajada kategoriyalar topilmadi.
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-xs">
                  Quyidagi tugma orqali yangi kategoriya yoki ichki kategoriya qo'shing.
                </p>
              </div>
            )}

            {/* Add category or subcategory button */}
            <InlineAddCategory
              onAdd={handleCreate}
              parentId={currentParentId}
              placeholder={currentParentId ? "+ Ichki kategoriya qo'shish" : "+ Yangi kategoriya qo'shish"}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoriesSection;
