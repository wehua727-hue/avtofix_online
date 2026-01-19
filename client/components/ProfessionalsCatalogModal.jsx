import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, Wrench, X } from "lucide-react";
import { professionalCategoriesAPI } from "@/services/api";

// Steps: 'category' -> 'subcategory'
export default function ProfessionalsCatalogModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [step, setStep] = useState("category"); // 'category', 'subcategory'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await professionalCategoriesAPI.getAll();
        setCategories(data);
      } catch (error) {
        console.error("Kategoriyalarni yuklashda xatolik:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => setIsAnimating(true));
      document.body.style.overflow = "hidden";
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        // Reset state when closing
        setStep("category");
        setSelectedCategory(null);
      }, 300);
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);



  const handleCategorySelect = (category) => {
    if (category.children?.length > 0) {
      setSelectedCategory(category);
      setStep("subcategory");
    } else {
      navigateToProfessionals(category._id);
    }
  };

  const handleSubcategorySelect = (subcategory) => {
    navigateToProfessionals(subcategory._id);
  };

  const navigateToProfessionals = (categoryId = null) => {
    const params = new URLSearchParams();
    if (categoryId) params.set("category", categoryId);
    
    const queryString = params.toString();
    navigate(`/professionals${queryString ? `?${queryString}` : ""}`);
    onClose();
  };

  const handleBack = () => {
    if (step === "subcategory") {
      setStep("category");
      setSelectedCategory(null);
    }
  };

  const getTitle = () => {
    switch (step) {
      case "category": return "Kategoriyani tanlang";
      case "subcategory": return selectedCategory?.name;
      default: return "Ustalar";
    }
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`absolute inset-0 transition-all duration-300 ease-out ${
          isAnimating ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        {/* Mobile Layout */}
        <div className="w-full h-full bg-white dark:bg-[#0c0d14] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              {step === "subcategory" && (
                <button
                  onClick={handleBack}
                  className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-400" />
                {getTitle()}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto pb-20">
            {/* Step: Category */}
            {step === "category" && (
              <div className="py-2">
                {/* All professionals option */}
                <button
                  onClick={() => navigateToProfessionals(null)}
                  className="flex items-center justify-between w-full mx-2 my-0.5 px-4 py-3.5 rounded-lg text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                  style={{ width: "calc(100% - 16px)" }}
                >
                  <span>Barcha ustalar</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="h-px bg-gray-200 dark:bg-white/10 mx-4 my-2" />
                {categories.map((category) => {
                  const hasChildren = category.children?.length > 0;
                  return (
                    <div
                      key={category._id}
                      className="flex items-center w-full mx-2 my-0.5 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-white/5"
                      style={{ width: "calc(100% - 16px)" }}
                    >
                      {/* Категория - при нажатии выбирается */}
                      <button
                        onClick={() => navigateToProfessionals(category._id)}
                        className="flex-1 text-left px-4 py-3.5"
                      >
                        <span>{category.name}</span>
                      </button>
                      {/* Стрелка - при нажатии открываются подкатегории */}
                      {hasChildren && (
                        <button
                          onClick={() => handleCategorySelect(category)}
                          className="p-3.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-r-lg"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step: Subcategory */}
            {step === "subcategory" && selectedCategory && (
              <div className="py-2">
                {/* Parent category option */}
                <button
                  onClick={() => navigateToProfessionals(selectedCategory._id)}
                  className="flex items-center justify-between w-full mx-2 my-0.5 px-4 py-3.5 rounded-lg text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                  style={{ width: "calc(100% - 16px)" }}
                >
                  <span>Barcha {selectedCategory.name}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="h-px bg-gray-200 dark:bg-white/10 mx-4 my-2" />
                {selectedCategory.children?.map((subcategory) => {
                  const hasNestedChildren = subcategory.children?.length > 0;
                  return (
                    <div
                      key={subcategory._id}
                      className="flex items-center w-full mx-2 my-0.5 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-white/5"
                      style={{ width: "calc(100% - 16px)" }}
                    >
                      {/* Подкатегория - при нажатии выбирается */}
                      <button
                        onClick={() => handleSubcategorySelect(subcategory)}
                        className="flex-1 text-left px-4 py-3.5"
                      >
                        <span>{subcategory.name}</span>
                      </button>
                      {/* Стрелка - показываем только если есть вложенные подкатегории */}
                      {hasNestedChildren && (
                        <button
                          onClick={() => {
                            setSelectedCategory(subcategory);
                          }}
                          className="p-3.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-r-lg"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
