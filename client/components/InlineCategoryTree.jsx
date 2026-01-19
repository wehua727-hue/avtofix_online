import InlineCategoryItem from './InlineCategoryItem';

/**
 * Recursive inline category tree (Notion-style)
 * Supports unlimited nesting with inline add/edit/delete
 */
const InlineCategoryTree = ({
  categories = [],
  level = 0,
  onUpdate,
  onDelete,
  onCreate
}) => {

  // Render single category with its children
  const renderCategory = (category) => {
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category._id}>
        <InlineCategoryItem
          category={category}
          level={level}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddChild={onCreate}
        >
          {/* Render children recursively */}
          {hasChildren && (
            <InlineCategoryTree
              categories={category.children}
              level={level + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onCreate={onCreate}
            />
          )}
        </InlineCategoryItem>
      </div>
    );
  };

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {categories.map(renderCategory)}
    </div>
  );
};

export default InlineCategoryTree;
