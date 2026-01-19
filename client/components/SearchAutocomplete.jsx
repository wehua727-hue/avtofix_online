import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Clock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { productsAPI } from "@/services/api";

const SEARCH_HISTORY_KEY = "search_history";
const MAX_HISTORY = 5;

const SearchAutocomplete = ({
  onSearch,
  placeholder = "Qidiruv...",
  className = "",
  isMobile = false
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  // Save to search history
  const saveToHistory = (term) => {
    const newHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, MAX_HISTORY);
    setSearchHistory(newHistory);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  };

  // Clear search history
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const results = await productsAPI.getSuggestions(searchQuery);
      setSuggestions(results);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  // Handle search submit
  const handleSearch = (searchTerm) => {
    const term = searchTerm || query;
    if (!term.trim()) return;

    saveToHistory(term.trim());
    setIsOpen(false);
    setQuery(term);

    if (onSearch) {
      onSearch(term.trim());
    } else {
      navigate(`/search?q=${encodeURIComponent(term.trim())}`);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const items = [...suggestions, ...searchHistory.filter(h => !suggestions.includes(h))];

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && items[selectedIndex]) {
        handleSearch(items[selectedIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = isOpen && (suggestions.length > 0 || searchHistory.length > 0 || query.length > 0);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const newQuery = e.target.value;
            setQuery(newQuery);
            setIsOpen(true);
            setSelectedIndex(-1);
            // Har bir harf yozilganda qidiruv qilish (bosh sahifa va categories uchun)
            if ((window.location.pathname === '/' || window.location.pathname === '/categories') && onSearch) {
              onSearch(newQuery);
            }
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 pr-10 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all ${isMobile ? "text-base" : ""
            }`}
        />
        {query ? (
          <button
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              inputRef.current?.focus();
            }}
            className="absolute right-10 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        ) : null}
        <button
          onClick={() => handleSearch()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition"
        >
          <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
          {/* Loading */}
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              Qidirilmoqda...
            </div>
          )}

          {/* Suggestions */}
          {!loading && suggestions.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Tavsiyalar
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  onClick={() => handleSearch(suggestion)}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition ${selectedIndex === index
                    ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                >
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="flex-1">{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* Search History */}
          {!loading && searchHistory.length > 0 && !query && (
            <div className="py-2 border-t border-gray-100 dark:border-white/5">
              <div className="px-4 py-1 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Qidiruv tarixi
                </span>
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-500 hover:text-red-600 transition"
                >
                  Tozalash
                </button>
              </div>
              {searchHistory.map((item, index) => (
                <button
                  key={item}
                  onClick={() => handleSearch(item)}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition ${selectedIndex === suggestions.length + index
                    ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="flex-1">{item}</span>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!loading && query.length >= 1 && suggestions.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                "{query}" bo'yicha hech narsa topilmadi
              </p>
              <button
                onClick={() => handleSearch()}
                className="mt-2 text-sm text-red-500 hover:text-red-600 transition"
              >
                Barcha mahsulotlardan qidirish
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
