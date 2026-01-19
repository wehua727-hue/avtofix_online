import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronsRight, Plus, X } from "lucide-react";
import { professionalCategoriesAPI } from "@/services/api";
import { Input } from "@/components/ui/input";

/**
 * ProfessionalCategoryPicker
 * Hierarchical category selector for professionals with ability to add new categories.
 */
const ProfessionalCategoryPicker = ({ value, onChange }) => {
  const [currentParentId, setCurrentParentId] = useState(null);
  const [currentTitle, setCurrentTitle] = useState("Kategoriyalar");
  const [levelsStack, setLevelsStack] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [lastSyncedValue, setLastSyncedValue] = useState(null);
  
  // New category form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const loadCategories = useCallback(async (parentId) => {
    try {
      setLoading(true);
      setError(null);
      const items = await professionalCategoriesAPI.getByParent(parentId);
      setCategories(items);
    } catch (e) {
      console.error("Error loading professional categories", e);
      setError(e.message || "Kategoriyalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories(null);
  }, [loadCategories]);

  // Sync from value (edit mode) - запускается когда value меняется
  useEffect(() => {
    const syncSelected = async () => {
      // Если value не изменился - не синхронизируем
      if (value === lastSyncedValue) return;
      
      if (!value) {
        // Сбрасываем только если value явно null/undefined и это изменение
        if (lastSyncedValue !== null) {
          setSelectedLabel("");
          setSelectedCategoryId(null);
          setCurrentParentId(null);
          setCurrentTitle("Kategoriyalar");
          setLevelsStack([]);
          loadCategories(null);
        }
        setLastSyncedValue(value);
        return;
      }

      try {
        const flat = await professionalCategoriesAPI.getAll(true);
        const map = new Map(flat.map((c) => [String(c._id), c]));
        let current = map.get(String(value));
        if (!current) {
          console.warn("Category not found for value:", value);
          setLastSyncedValue(value);
          return;
        }

        const chain = [];
        while (current) {
          chain.push(current);
          const parentId = current.parentId || current.parent || null;
          if (!parentId) break;
          current = map.get(String(parentId));
        }

        chain.reverse();
        const selected = chain[chain.length - 1];

        let parentId = null;
        let title = "Kategoriyalar";
        const stack = [];
        for (let i = 0; i < chain.length - 1; i++) {
          stack.push({ parentId, title });
          parentId = String(chain[i]._id);
          title = chain[i].name;
        }

        setLevelsStack(stack);
        setCurrentParentId(selected._id);
        setCurrentTitle(selected.name);
        setSelectedCategoryId(selected._id);

        const label = chain.map((c) => c.name).join(" > ") || selected.name;
        setSelectedLabel(label);

        await loadCategories(selected._id);
        setLastSyncedValue(value);
      } catch (e) {
        console.warn("Failed to initialize professional category picker from value", e);
        setLastSyncedValue(value);
      }
    };

    syncSelected();
  }, [value, lastSyncedValue, loadCategories]);

  const handleCategoryClick = async (category) => {
    if (!category?._id) return;

    setSelectedCategoryId(category._id);

    const titles = ["Kategoriyalar"];
    levelsStack.forEach((lvl, idx) => {
      if (idx === 0 && lvl.title === "Kategoriyalar") return;
      if (lvl.title) titles.push(lvl.title);
    });
    if (currentTitle && currentTitle !== "Kategoriyalar") {
      titles.push(currentTitle);
    }
    titles.push(category.name);

    const pathLabel = titles.filter(Boolean).slice(1).join(" > ");
    const baseLabel = pathLabel || category.name;

    setSelectedLabel(baseLabel);
    if (onChange) {
      onChange(category._id, { pathLabel: baseLabel });
    }

    setLoading(true);
    setError(null);
    try {
      const children = await professionalCategoriesAPI.getByParent(category._id);

      // Если есть подкатегории — переходим глубже
      if (Array.isArray(children) && children.length > 0) {
        setLevelsStack((prev) => [
          ...prev,
          { parentId: currentParentId, title: currentTitle },
        ]);
        setCurrentParentId(category._id);
        setCurrentTitle(category.name);
        setCategories(children);
      }
      // Если подкатегорий нет — просто выбираем категорию, не переходим
      // Категория уже выбрана выше (setSelectedCategoryId, onChange)
    } catch (e) {
      console.error("Error loading child categories", e);
      setError(e.message || "Kategoriyalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (levelsStack.length === 0) {
      setCurrentParentId(null);
      setCurrentTitle("Kategoriyalar");
      loadCategories(null);
      setSelectedCategoryId(null);
      setSelectedLabel("");
      if (onChange) {
        onChange(null, { pathLabel: "" });
      }
      return;
    }

    const prev = levelsStack[levelsStack.length - 1];
    const rest = levelsStack.slice(0, -1);
    setLevelsStack(rest);
    setCurrentParentId(prev.parentId);
    setCurrentTitle(prev.title);
    loadCategories(prev.parentId ?? null);

    if (prev.parentId) {
      setSelectedCategoryId(prev.parentId);
      setSelectedLabel(prev.title || "");
      if (onChange) {
        onChange(prev.parentId, { pathLabel: prev.title || "" });
      }
    } else {
      setSelectedCategoryId(null);
      setSelectedLabel("");
      if (onChange) {
        onChange(null, { pathLabel: "" });
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    setAddingCategory(true);
    try {
      const newCategory = await professionalCategoriesAPI.create({
        name: newCategoryName.trim(),
        parentId: currentParentId,
      });
      
      setCategories((prev) => [...prev, newCategory]);
      setNewCategoryName("");
      setShowAddForm(false);
    } catch (e) {
      console.error("Error creating category:", e);
      setError(e.message || "Kategoriya qo'shishda xatolik");
    } finally {
      setAddingCategory(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected category tag */}
      {selectedLabel ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Tanlangan kategoriya:</span>
          <Badge className="rounded-full bg-emerald-600/80 text-xs text-white border border-emerald-400/60 px-3 py-1 max-w-full truncate">
            {selectedLabel}
          </Badge>
        </div>
      ) : (
        <p className="text-xs text-gray-500">Kategoriya tanlanmagan</p>
      )}

      <div className="rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-black/70 p-3 max-h-[320px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(levelsStack.length > 0 || currentParentId !== null) && (
              <button
                type="button"
                onClick={handleBack}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:border-emerald-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition"
                aria-label="Orqaga"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-gray-500">Kategoriya</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{currentTitle}</span>
            </div>
          </div>
          
          {/* Add category button */}
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:border-emerald-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition"
            aria-label="Kategoriya qo'shish"
          >
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>

        {/* Add category form */}
        {showAddForm && (
          <div className="mb-3 flex gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Yangi kategoriya nomi"
              className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm h-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddCategory}
              disabled={addingCategory || !newCategoryName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3"
            >
              {addingCategory ? "..." : "Qo'shish"}
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-gray-400">
              Kategoriyalar yuklanmoqda...
            </div>
          ) : error ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-xs text-red-400">
              <span>{error}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => loadCategories(currentParentId)}
                className="border-emerald-500 text-emerald-400 hover:bg-emerald-600/20 hover:text-white"
              >
                Qayta urinish
              </Button>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1 text-xs text-gray-400 text-center px-4">
              {selectedCategoryId ? (
                <>
                  <p>Bu kategoriya uchun ichki kategoriyalar mavjud emas.</p>
                  <p className="text-gray-500">Yangi kategoriya qo'shish uchun + tugmasini bosing.</p>
                </>
              ) : (
                <>
                  <p>Kategoriyalar topilmadi</p>
                  <p className="text-gray-500">Yangi kategoriya qo'shish uchun + tugmasini bosing.</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {categories.map((category) => (
                <button
                  key={category._id}
                  type="button"
                  onClick={() => handleCategoryClick(category)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                    selectedCategoryId === category._id
                      ? "border-emerald-500 bg-emerald-100 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300"
                      : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/80 text-gray-800 dark:text-gray-100 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-600/10"
                  }`}
                >
                  <span className="truncate">{category.name}</span>
                  <ChevronsRight className="h-3.5 w-3.5 text-gray-500" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalCategoryPicker;
