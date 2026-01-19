import { Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { ChevronRight, LayoutGrid, X } from "lucide-react";
import { categoriesAPI } from "@/services/api";

export default function CatalogModal({ isOpen, onClose }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoriesAPI.getAll();
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

  const handleCategoryClick = useCallback(() => {
    onClose();
    setSelectedCategory(null);
  }, [onClose]);

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
        {/* Desktop Layout */}
        <div className="hidden md:flex w-full h-full">
          {/* Left Sidebar */}
          <div
            className="w-[280px] h-full bg-[#0c0d14] border-r border-white/10 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Kategoriyalar</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {categories.map((category) => {
                const hasChildren = category.children?.length > 0;
                const isSelected = selectedCategory?._id === category._id;
                return (
                  <div
                    key={category._id}
                    className={`group flex items-center mx-2 my-0.5 rounded-lg transition-all ${
                      isSelected ? "bg-red-500/20" : "hover:bg-white/5"
                    }`}
                    onMouseEnter={() => hasChildren && setSelectedCategory(category)}
                  >
                    <Link
                      to={`/categories?category=${category._id}`}
                      onClick={handleCategoryClick}
                      className={`flex-1 px-4 py-3 font-medium ${
                        isSelected ? "text-white" : "text-gray-300 hover:text-white"
                      }`}
                    >
                      {category.name}
                    </Link>
                    {hasChildren && (
                      <ChevronRight
                        className={`w-4 h-4 mr-3 ${
                          isSelected ? "text-red-400" : "text-gray-600 opacity-0 group-hover:opacity-100"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 h-full bg-[#0f1017] overflow-y-auto">
            {selectedCategory?.children?.length > 0 ? (
              <div className="p-8">
                <Link
                  to={`/categories?category=${selectedCategory._id}`}
                  onClick={handleCategoryClick}
                  className="inline-flex items-center gap-2 text-2xl font-bold text-white hover:text-red-400 mb-6"
                >
                  {selectedCategory.name}
                  <ChevronRight className="w-6 h-6" />
                </Link>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-1">
                  {selectedCategory.children.map((sub) => (
                    <Link
                      key={sub._id}
                      to={`/categories?category=${sub._id}`}
                      onClick={handleCategoryClick}
                      className="py-3 text-gray-400 hover:text-white border-b border-white/5"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <LayoutGrid className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                  <p className="text-lg text-gray-500">Kategoriyani tanlang</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden w-full h-full bg-[#0c0d14] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">
              {selectedCategory ? selectedCategory.name : "Kategoriyalar"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pb-20">
            {!selectedCategory ? (
              <div className="py-2">
                {categories.map((category) => {
                  const hasChildren = category.children?.length > 0;
                  return (
                    <div key={category._id} className="flex items-center mx-2 my-0.5 rounded-lg hover:bg-white/5">
                      <Link
                        to={`/categories?category=${category._id}`}
                        onClick={handleCategoryClick}
                        className="flex-1 px-4 py-3.5 text-gray-300 font-medium"
                      >
                        {category.name}
                      </Link>
                      {hasChildren && (
                        <button onClick={() => setSelectedCategory(category)} className="p-3 text-gray-500">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-2 px-4 py-3 text-gray-400 w-full"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span>Orqaga</span>
                </button>
                <Link
                  to={`/categories?category=${selectedCategory._id}`}
                  onClick={handleCategoryClick}
                  className="flex items-center gap-2 mx-2 px-4 py-3 text-white font-semibold bg-white/5 rounded-lg mb-2"
                >
                  {selectedCategory.name}
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <div className="border-t border-white/10 pt-2">
                  {selectedCategory.children?.map((sub) => (
                    <Link
                      key={sub._id}
                      to={`/categories?category=${sub._id}`}
                      onClick={handleCategoryClick}
                      className="block px-6 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg mx-2"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
