import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Reusable TreeView component for hierarchical category display
 * Supports expand/collapse, add/edit/delete actions, and drag-and-drop
 */
const CategoryTreeView = ({ 
  categories = [], 
  onAdd, 
  onEdit, 
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  level = 0 
}) => {
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDragStart = (e, category) => {
    e.stopPropagation();
    if (onDragStart) {
      onDragStart(category);
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleDragOver = (e, category) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDragOver) {
      onDragOver(category);
    }
  };

  const handleDrop = (e, category) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDrop) {
      onDrop(category);
    }
  };

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-1 ${level > 0 ? 'ml-6 border-l-2 border-gray-800 pl-3' : ''}`}>
      {categories.map((category) => {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = expandedIds.has(category._id);

        return (
          <div key={category._id} className="group">
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, category)}
              onDragOver={(e) => handleDragOver(e, category)}
              onDrop={(e) => handleDrop(e, category)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50 transition-colors cursor-move"
            >
              {/* Drag Handle */}
              <GripVertical className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />

              {/* Expand/Collapse Button */}
              <button
                type="button"
                onClick={() => toggleExpand(category._id)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                disabled={!hasChildren}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )
                ) : (
                  <span className="w-4 h-4" />
                )}
              </button>

              {/* Category Name */}
              <span className="flex-1 text-gray-200 text-sm md:text-base truncate">
                {category.name}
              </span>

              {/* Badge for children count */}
              {hasChildren && (
                <span className="px-2 py-0.5 text-xs bg-gray-800 text-gray-400 rounded-full flex-shrink-0">
                  {category.children.length}
                </span>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onAdd && onAdd(category)}
                  className="h-8 w-8 p-0 hover:bg-green-600/20 hover:text-green-500"
                  title="Ichki kategoriya qo'shish"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit && onEdit(category)}
                  className="h-8 w-8 p-0 hover:bg-blue-600/20 hover:text-blue-500"
                  title="Tahrirlash"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete && onDelete(category)}
                  className="h-8 w-8 p-0 hover:bg-red-600/20 hover:text-red-500"
                  title="O'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Render Children */}
            {hasChildren && isExpanded && (
              <CategoryTreeView
                categories={category.children}
                onAdd={onAdd}
                onEdit={onEdit}
                onDelete={onDelete}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CategoryTreeView;
