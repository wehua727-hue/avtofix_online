import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronsRight } from "lucide-react";
import { categoriesAPI } from "@/services/api";

/**
 * CategoryPicker
 * Uzum-style hierarchical category selector with infinite nesting.
 *
 * Props:
 * - value: currently selected categoryId (string | null)
 * - onChange: (categoryId: string | null, meta: { pathLabel: string }) => void
 */
const CategoryPicker = ({ value, onChange }) => {
  const [currentParentId, setCurrentParentId] = useState(null);
  const [currentTitle, setCurrentTitle] = useState("Kategoriyalar");
  const [levelsStack, setLevelsStack] = useState([]); // { parentId, title }
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [initializedFromValue, setInitializedFromValue] = useState(false);

  const loadCategories = useCallback(async (parentId) => {
    try {
      setLoading(true);
      setError(null);
      const items = await categoriesAPI.getByParent(parentId);
      setCategories(items);
    } catch (e) {
      console.error("Error loading categories", e);
      setError(e.message || "Kategoriyalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load: root categories (parentId = null)
  useEffect(() => {
    loadCategories(null);
  }, [loadCategories]);

  // If value already set (edit mode) — restore navigation state and label
  useEffect(() => {
    const syncSelected = async () => {
      if (!value) {
        setSelectedLabel("");
        setSelectedCategoryId(null);
        setInitializedFromValue(false);
        return;
      }

      if (initializedFromValue) {
        return;
      }

      try {
        // Load flat list once to reconstruct chain by parentId
        const flat = await categoriesAPI.getAll(true);
        const map = new Map(flat.map((c) => [String(c._id), c]));
        let current = map.get(String(value));
        if (!current) {
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

        // Build levels stack as if пользователь прошёл по цепочке кликами
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

        // Label: build path on client from chain names
        const label = chain.map((c) => c.name).join(" > ") || selected.name;
        setSelectedLabel(label);
        if (onChange) {
          onChange(selected._id, { pathLabel: label });
        }

        // Load children of selected category (may be empty for leaf)
        await loadCategories(selected._id);
        setInitializedFromValue(true);
      } catch (e) {
        console.warn("Failed to initialize category picker from value", e);
      }
    };

    syncSelected();
  }, [value, initializedFromValue, loadCategories, onChange]);

  const handleCategoryClick = async (category) => {
    if (!category?._id) return;

    // Immediately treat clicked category as selected, build path from current stack
    setSelectedCategoryId(category._id);

    const titles = [];
    // восстановить имена уровней из levelsStack + currentTitle
    titles.push("Kategoriyalar");
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

    // Then try to load children and, if any, go deeper
    setLoading(true);
    setError(null);
    try {
      const children = await categoriesAPI.getByParent(category._id);

      if (Array.isArray(children) && children.length > 0) {
        // Go deeper: push current level to stack and show children
        setLevelsStack((prev) => [
          ...prev,
          { parentId: currentParentId, title: currentTitle },
        ]);
        setCurrentParentId(category._id);
        setCurrentTitle(category.name);
        setCategories(children);
      } else {
        // Leaf category: move one level deeper so back button appears,
        // but show info message instead of child list
        setLevelsStack((prev) => [
          ...prev,
          { parentId: currentParentId, title: currentTitle },
        ]);
        setCurrentParentId(category._id);
        setCurrentTitle(category.name);
        setCategories([]);
      }
    } catch (e) {
      console.error("Error loading child categories", e);
      setError(e.message || "Kategoriyalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (levelsStack.length === 0) {
      // Back to root
      setCurrentParentId(null);
      setCurrentTitle("Kategoriyalar");
      loadCategories(null);
      // At root level there is no selected category by hierarchy
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

     // Move selection one level up: select the category of the previous level,
     // or clear selection if it is root
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

  return (
    <div className="space-y-2">
      {/* Selected category tag */}
      {selectedLabel ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Tanlangan kategoriya:</span>
          <Badge className="rounded-full bg-red-600/80 text-xs text-white border border-red-400/60 px-3 py-1 max-w-full truncate">
            {selectedLabel}
          </Badge>
        </div>
      ) : (
        <p className="text-xs text-gray-500">Kategoriya tanlanmagan</p>
      )}

      <div className="rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-black/70 p-3 max-h-[320px] overflow-hidden flex flex-col">
        {/* Header with back arrow and title */}
        <div className="mb-3 flex items-center gap-2">
          {(levelsStack.length > 0 || currentParentId !== null) && (
            <button
              type="button"
              onClick={handleBack}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:border-red-500 hover:text-red-500 dark:hover:text-red-400 transition"
              aria-label="Orqaga"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-gray-500">Kategoriya</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
              {currentTitle}
            </span>
          </div>
        </div>

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
                className="border-red-500 text-red-400 hover:bg-red-600/20 hover:text-white"
              >
                Qayta urinish
              </Button>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1 text-xs text-gray-400 text-center px-4">
              {selectedCategoryId ? (
                <>
                  <p>Bu kategoriya uchun qo'shimcha ichki kategoriyalar mavjud emas.</p>
                  {selectedLabel && (
                    <p className="text-gray-300">
                      Tanlangan kategoriya: <span className="font-semibold text-white">{selectedLabel}</span>
                    </p>
                  )}
                  <p className="text-gray-500">Orqaga qaytish tugmasini bosib boshqa yo'nalishni tanlashingiz mumkin.</p>
                </>
              ) : (
                <p>Kategoriyalar topilmadi</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {categories.map((category) => (
                <button
                  key={category._id}
                  type="button"
                  onClick={() => handleCategoryClick(category)}
                  className="flex items-center justify-between rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/80 px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-100 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-600/10 transition"
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

export default CategoryPicker;
