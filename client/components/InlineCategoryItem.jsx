import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Trash2, Plus, Check, X, Edit2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InlineAddCategory from './InlineAddCategory';

/**
 * Inline editable category item (Notion-style)
 * Features: separate view/edit modes, inline delete confirmation, expand/collapse
 */
const InlineCategoryItem = ({
  category,
  level = 0,
  onUpdate,
  onDelete,
  onAddChild,
  children
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(category.name);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const inputRef = useRef(null);

  // Check if category has children in data (not React children)
  const hasChildren = category.children && Array.isArray(category.children) && category.children.length > 0;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle click on category name to toggle expand
  const handleNameClick = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle edit button click
  const handleEditClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(category.name);
  };

  // Save edited name
  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== category.name) {
      await onUpdate(category._id, { name: trimmed });
    }
    setIsEditing(false);
  };

  // Cancel editing
  const handleCancel = () => {
    setEditValue(category.name);
    setIsEditing(false);
  };

  // Handle key press in edit mode
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
    // Small delay to allow button clicks
    setTimeout(() => {
      if (isEditing) {
        handleSave();
      }
    }, 150);
  };

  // Toggle expand/collapse
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle add child click
  const handleAddChildClick = (e) => {
    e.stopPropagation();
    setShowAddChild(true);
    setIsExpanded(true); // Auto-expand when adding child
  };

  // Handle child created
  const handleChildCreated = async (data) => {
    try {
      await onAddChild(data);
      setShowAddChild(false);
    } catch (error) {
      // Keep form open if there was an error
      console.error('Error adding child:', error);
    }
  };

  // Handle delete click
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  // Check if category has children
  const getDeleteMessage = () => {
    if (hasChildren) {
      return `Bu kategoriyada ${category.children.length} ta ichki kategoriya bor. Barchasi o'chiriladi!`;
    }
    return "O'chirishni tasdiqlaysizmi?";
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    await onDelete(category._id);
    setShowDeleteConfirm(false);
  };

  // Cancel delete
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const indentClass = level > 0 ? `ml-${Math.min(level * 6, 24)}` : '';

  return (
    <div className="group">
      {/* Main category row */}
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-800/30 transition-all group"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          type="button"
          onClick={toggleExpand}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors rounded"
        >
          {hasChildren || showAddChild ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <span className="w-4 h-4" />
          )}
        </button>

        {/* Category name or edit input */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="flex-1 bg-blue-900/30 border-2 border-blue-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder="Kategoriya nomi"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              <Check className="w-4 h-4 mr-1" />
              Saqlash
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="h-8 px-3 hover:bg-gray-700 text-gray-300"
            >
              <X className="w-4 h-4 mr-1" />
              Bekor
            </Button>
          </div>
        ) : (
          <>
            {/* Category name (clickable to expand) */}
            <button
              type="button"
              onClick={handleNameClick}
              className="flex-1 text-left text-sm text-gray-200 hover:text-white transition-colors truncate py-1"
            >
              {category.name}
            </button>

            {/* Children count badge */}
            {hasChildren && (
              <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full flex-shrink-0">
                {category.children.length}
              </span>
            )}


            {/* Other action buttons (show on hover) */}
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleEditClick}
                className="h-8 px-3 border-blue-600 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 hover:text-blue-300"
                title="Tahrirlash"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Tahrirlash
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDeleteClick}
                className="h-8 px-3 border-red-600 bg-red-600/10 text-red-400 hover:bg-red-600/20 hover:text-red-300"
                title="O'chirish"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                O'chirish
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation (inline) */}
      {showDeleteConfirm && (
        <div
          className={`flex flex-col gap-2 py-3 px-4 ml-12 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200 ${
            hasChildren 
              ? 'bg-orange-900/30 border-2 border-orange-500' 
              : 'bg-red-900/20 border border-red-600/30'
          }`}
          style={{ marginLeft: `${level * 24 + 48}px` }}
        >
          {/* Warning icon and message */}
          <div className="flex items-start gap-2">
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              hasChildren ? 'text-orange-400' : 'text-red-400'
            }`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                hasChildren ? 'text-orange-300' : 'text-red-400'
              }`}>
                {getDeleteMessage()}
              </p>
              {hasChildren && (
                <p className="text-xs text-orange-400/70 mt-1">
                  Diqqat: Barcha ichki kategoriyalar ham o'chiriladi!
                </p>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteConfirm}
              className={`flex-1 h-8 text-white font-medium ${
                hasChildren 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {hasChildren ? 'Barchasini o\'chirish' : 'Ha, o\'chirish'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleDeleteCancel}
              className="flex-1 h-8 hover:bg-gray-700 text-gray-300"
            >
              Bekor qilish
            </Button>
          </div>
        </div>
      )}

      {/* Render children and add child form */}
      {isExpanded && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          {/* Existing children */}
          {hasChildren && children}
          
          {/* Add child field (always visible when expanded) */}
          {!showAddChild && (
            <div style={{ marginLeft: `${(level + 1) * 24}px` }} className="py-1">
              <button
                type="button"
                onClick={handleAddChildClick}
                className="w-full px-3 py-2 text-sm text-gray-500 hover:text-green-400 border border-dashed border-gray-600 hover:border-green-500 rounded bg-gray-800/30 hover:bg-green-600/10 transition-all text-left"
              >
                + Ichki kategoriya nomi
              </button>
            </div>
          )}
          
          {/* Inline add child form */}
          {showAddChild && (
            <InlineAddCategory
              onAdd={handleChildCreated}
              parentId={category._id}
              level={level + 1}
              placeholder="Ichki kategoriya nomi"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default InlineCategoryItem;
