import { useState, useRef, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Inline add category button/input (Notion-style)
 * Transforms from button to input when clicked
 */
const InlineAddCategory = ({ 
  onAdd, 
  parentId = null, 
  level = 0,
  placeholder = "Yangi kategoriya"
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const savingRef = useRef(false);

  // Focus input when adding starts
  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  // Start adding mode
  const handleStartAdd = () => {
    setIsAdding(true);
    setValue('');
  };

  // Save new category
  const handleSave = async () => {
    if (savingRef.current) return;
    const trimmed = value.trim();
    if (trimmed) {
      try {
        savingRef.current = true;
        await onAdd({ name: trimmed, parentId });
        setValue('');
      } finally {
        savingRef.current = false;
      }
    }
    setIsAdding(false);
  };

  // Cancel adding
  const handleCancel = () => {
    setValue('');
    setIsAdding(false);
  };

  // Handle key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Handle blur (click outside)
  const handleBlur = () => {
    // On blur, only cancel if empty. Do not auto-save to avoid double create.
    setTimeout(() => {
      if (isAdding && !value.trim()) {
        handleCancel();
      }
    }, 0);
  };

  if (isAdding) {
    return (
      <div
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 py-3 px-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-500 dark:border-purple-500 animate-in fade-in slide-in-from-top-2 duration-200"
        style={{ marginLeft: level > 0 ? `${Math.min(level * 16, 32)}px` : '0' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="flex-1 bg-white dark:bg-purple-900/30 border-2 border-purple-400 dark:border-purple-400 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent placeholder:text-purple-600 dark:placeholder:text-purple-300/50"
          placeholder={placeholder}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!value.trim()}
            className="flex-1 sm:flex-none h-9 px-4 bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Saqlash
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="flex-1 sm:flex-none h-9 px-4 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
          >
            <X className="w-4 h-4 mr-1.5" />
            Bekor
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStartAdd}
      className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all w-full text-left group border border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
      style={{ marginLeft: level > 0 ? `${Math.min(level * 16, 32)}px` : '0' }}
    >
      <Plus className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
      <span className="text-sm">{placeholder}</span>
    </button>
  );
};

export default InlineAddCategory;
