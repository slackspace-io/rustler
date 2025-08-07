import { useState, useEffect } from 'react';
import { categoriesApi, categoryGroupsApi } from '../../services/api';
import type { Category, CategoryGroup, CategorySpending } from '../../services/api';
import './Categories.css';

const CategoriesList = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for category groups
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  // State for drag and drop
  const [draggedCategory, setDraggedCategory] = useState<Category | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);

  // State for group drag and drop
  const [draggedGroup, setDraggedGroup] = useState<CategoryGroup | null>(null);
  const [dragOverGroupPosition, setDragOverGroupPosition] = useState<number | null>(null);
  const [isReorderingGroups, setIsReorderingGroups] = useState(false);

  // State for collapse/expand
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [allCollapsed, setAllCollapsed] = useState(false);

  // State for category spending
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [loadingSpending, setLoadingSpending] = useState(true);
  const [spendingError, setSpendingError] = useState<string | null>(null);

  // State for new category form
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryGroupId, setNewCategoryGroupId] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // State for new category group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);

  // State for editing
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGroupId, setEditGroupId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // State for editing category group
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [editGroupError, setEditGroupError] = useState<string | null>(null);

  // Fetch categories, category groups, and spending on component mount
  useEffect(() => {
    fetchCategories();
    fetchCategoryGroups();
    fetchCategorySpending();
  }, []);

  // Handle collapse/expand all
  useEffect(() => {
    if (allCollapsed) {
      // Collapse all groups
      const allGroupIds = categoryGroups.map(group => group.id);
      setCollapsedGroups(new Set(allGroupIds));
    } else {
      // Expand all groups
      setCollapsedGroups(new Set());
    }
  }, [allCollapsed, categoryGroups]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoriesApi.getCategories();
      setCategories(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
      setLoading(false);
    }
  };

  const fetchCategoryGroups = async () => {
    try {
      setLoadingGroups(true);
      const data = await categoryGroupsApi.getCategoryGroups();
      setCategoryGroups(data);
      setLoadingGroups(false);
    } catch (err) {
      console.error('Error fetching category groups:', err);
      setGroupsError('Failed to load category groups');
      setLoadingGroups(false);
    }
  };

  const fetchCategorySpending = async () => {
    try {
      setLoadingSpending(true);
      const data = await categoriesApi.getCategorySpending();
      setCategorySpending(data);
      setLoadingSpending(false);
    } catch (err) {
      console.error('Error fetching category spending:', err);
      setSpendingError('Failed to load category spending');
      setLoadingSpending(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategoryName.trim()) {
      setCreateError('Category name is required');
      return;
    }

    // Check if category already exists
    const categoryExists = categories.some(
      category => category.name.toLowerCase() === newCategoryName.toLowerCase()
    );

    if (categoryExists) {
      setCreateError('A category with this name already exists');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const newCategory = await categoriesApi.createCategory({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
        group_id: newCategoryGroupId
      });

      setCategories(prevCategories => [...prevCategories, newCategory]);

      // Reset form
      setNewCategoryName('');
      setNewCategoryDescription('');
      setNewCategoryGroupId(undefined);
      setCreating(false);
    } catch (err) {
      console.error('Error creating category:', err);
      setCreateError('Failed to create category');
      setCreating(false);
    }
  };

  const handleCreateCategoryGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newGroupName.trim()) {
      setCreateGroupError('Group name is required');
      return;
    }

    // Check if group already exists
    const groupExists = categoryGroups.some(
      group => group.name.toLowerCase() === newGroupName.toLowerCase()
    );

    if (groupExists) {
      setCreateGroupError('A group with this name already exists');
      return;
    }

    try {
      setCreatingGroup(true);
      setCreateGroupError(null);

      const newGroup = await categoryGroupsApi.createCategoryGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined
      });

      setCategoryGroups(prevGroups => [...prevGroups, newGroup]);

      // Reset form
      setNewGroupName('');
      setNewGroupDescription('');
      setCreatingGroup(false);
    } catch (err) {
      console.error('Error creating category group:', err);
      setCreateGroupError('Failed to create category group');
      setCreatingGroup(false);
    }
  };

  const handleStartEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditName(category.name);
    setEditDescription(category.description || '');
    setEditGroupId(category.group_id);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditName('');
    setEditDescription('');
    setEditGroupId(undefined);
    setEditError(null);
  };

  const handleStartEditGroup = (group: CategoryGroup) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupDescription(group.description || '');
    setEditGroupError(null);
  };

  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setEditGroupName('');
    setEditGroupDescription('');
    setEditGroupError(null);
  };

  const handleSaveEdit = async (categoryId: string) => {
    if (!editName.trim()) {
      setEditError('Category name is required');
      return;
    }

    // Check if the new name conflicts with another category
    const nameConflict = categories.some(
      category => category.id !== categoryId &&
                 category.name.toLowerCase() === editName.toLowerCase()
    );

    if (nameConflict) {
      setEditError('A category with this name already exists');
      return;
    }

    try {
      setSaving(true);
      setEditError(null);

      const updatedCategory = await categoriesApi.updateCategory(categoryId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        group_id: editGroupId
      });

      // Update the categories list
      setCategories(prevCategories =>
        prevCategories.map(category =>
          category.id === categoryId ? updatedCategory : category
        )
      );

      // Exit edit mode
      setEditingCategoryId(null);
      setSaving(false);
    } catch (err) {
      console.error('Error updating category:', err);
      setEditError('Failed to update category');
      setSaving(false);
    }
  };

  const handleSaveEditGroup = async (groupId: string) => {
    if (!editGroupName.trim()) {
      setEditGroupError('Group name is required');
      return;
    }

    // Check if the new name conflicts with another group
    const nameConflict = categoryGroups.some(
      group => group.id !== groupId &&
               group.name.toLowerCase() === editGroupName.toLowerCase()
    );

    if (nameConflict) {
      setEditGroupError('A group with this name already exists');
      return;
    }

    try {
      setSavingGroup(true);
      setEditGroupError(null);

      const updatedGroup = await categoryGroupsApi.updateCategoryGroup(groupId, {
        name: editGroupName.trim(),
        description: editGroupDescription.trim() || undefined
      });

      // Update the groups list
      setCategoryGroups(prevGroups =>
        prevGroups.map(group =>
          group.id === groupId ? updatedGroup : group
        )
      );

      // Exit edit mode
      setEditingGroupId(null);
      setSavingGroup(false);
    } catch (err) {
      console.error('Error updating category group:', err);
      setEditGroupError('Failed to update category group');
      setSavingGroup(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category? This may affect transactions using this category.')) {
      try {
        await categoriesApi.deleteCategory(categoryId);

        // Remove the category from the list
        setCategories(prevCategories =>
          prevCategories.filter(category => category.id !== categoryId)
        );
      } catch (err) {
        console.error('Error deleting category:', err);
        setError('Failed to delete category');
      }
    }
  };

  const handleDeleteCategoryGroup = async (groupId: string) => {
    if (window.confirm('Are you sure you want to delete this category group? Categories in this group will no longer be grouped.')) {
      try {
        await categoryGroupsApi.deleteCategoryGroup(groupId);

        // Remove the group from the list
        setCategoryGroups(prevGroups =>
          prevGroups.filter(group => group.id !== groupId)
        );

        // Update categories that were in this group to have no group
        setCategories(prevCategories =>
          prevCategories.map(category =>
            category.group_id === groupId ? { ...category, group_id: undefined } : category
          )
        );
      } catch (err) {
        console.error('Error deleting category group:', err);
        setError('Failed to delete category group');
      }
    }
  };

  // Category drag and drop handlers
  const handleDragStart = (category: Category, e: React.DragEvent<HTMLTableRowElement>) => {
    setDraggedCategory(category);
    // Set data for the drag operation
    e.dataTransfer.setData('text/plain', category.id);
    e.dataTransfer.setData('type', 'category');
    // Set the drag effect
    e.dataTransfer.effectAllowed = 'move';

    // Add a class to the dragged element for styling
    if (e.currentTarget.classList) {
      e.currentTarget.classList.add('dragging');
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    // Remove the dragging class
    if (e.currentTarget.classList) {
      e.currentTarget.classList.remove('dragging');
    }

    // Reset drag state
    setDraggedCategory(null);
    setDragOverGroupId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // Prevent default to allow drop
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (groupId: string | null, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverGroupId(groupId);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Only reset if we're leaving the drop target, not entering a child element
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setDragOverGroupId(null);
  };

  const handleDrop = async (groupId: string | null, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Reset drag over state
    setDragOverGroupId(null);

    // Get the data from the drag operation
    const dataType = e.dataTransfer.getData('type');

    if (dataType === 'category') {
      // Handle category drop
      const categoryId = e.dataTransfer.getData('text/plain');
      if (!categoryId || !draggedCategory) return;

      // Don't do anything if dropping into the same group
      if (draggedCategory.group_id === groupId) return;

      // Update the category's group
      await updateCategoryGroup(categoryId, groupId);
    }
  };

  // Group drag and drop handlers
  const handleGroupDragStart = (group: CategoryGroup, index: number, e: React.DragEvent<HTMLTableRowElement>) => {
    setDraggedGroup(group);
    // Set data for the drag operation
    e.dataTransfer.setData('text/plain', group.id);
    e.dataTransfer.setData('type', 'group');
    e.dataTransfer.setData('index', index.toString());
    // Set the drag effect
    e.dataTransfer.effectAllowed = 'move';

    // Add a class to the dragged element for styling
    if (e.currentTarget.classList) {
      e.currentTarget.classList.add('dragging');
    }
  };

  const handleGroupDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    // Remove the dragging class
    if (e.currentTarget.classList) {
      e.currentTarget.classList.remove('dragging');
    }

    // Reset drag state
    setDraggedGroup(null);
    setDragOverGroupPosition(null);
  };

  const handleGroupDragOver = (index: number, e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Set the position where the group would be dropped
    setDragOverGroupPosition(index);
  };

  const handleGroupDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    // Only reset if we're leaving the drop target, not entering a child element
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setDragOverGroupPosition(null);
  };

  const handleGroupDrop = async (targetIndex: number, e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();

    // Reset drag over state
    setDragOverGroupPosition(null);

    // Get the data from the drag operation
    const dataType = e.dataTransfer.getData('type');

    if (dataType === 'group') {
      // Handle group drop
      const groupId = e.dataTransfer.getData('text/plain');
      const sourceIndex = parseInt(e.dataTransfer.getData('index'), 10);

      if (isNaN(sourceIndex) || !groupId || !draggedGroup || sourceIndex === targetIndex) return;

      // Reorder the groups
      await reorderCategoryGroups(sourceIndex, targetIndex);
    }
  };

  // Function to reorder category groups
  const reorderCategoryGroups = async (sourceIndex: number, targetIndex: number) => {
    try {
      setIsReorderingGroups(true);

      // Create a new array with the reordered groups
      const newGroups = [...categoryGroups];
      const [movedGroup] = newGroups.splice(sourceIndex, 1);
      newGroups.splice(targetIndex, 0, movedGroup);

      // Update the state with the new order
      setCategoryGroups(newGroups);

      // In a real application, you would also update the order in the backend
      // For now, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 500));

      setIsReorderingGroups(false);
    } catch (err) {
      console.error('Error reordering category groups:', err);
      setGroupsError('Failed to reorder category groups');
      setIsReorderingGroups(false);
    }
  };

  const updateCategoryGroup = async (categoryId: string, groupId: string | null) => {
    try {
      setIsUpdatingGroup(true);
      setError(null);

      // Find the category
      const category = categories.find(c => c.id === categoryId);
      if (!category) {
        console.error('Category not found:', categoryId);
        return;
      }

      // Update the category in the backend
      const updatedCategory = await categoriesApi.updateCategory(categoryId, {
        group_id: groupId || undefined
      });

      // Update the local state
      setCategories(prevCategories =>
        prevCategories.map(c =>
          c.id === categoryId ? updatedCategory : c
        )
      );

      setIsUpdatingGroup(false);
    } catch (err) {
      console.error('Error updating category group:', err);
      setError('Failed to update category group');
      setIsUpdatingGroup(false);
    }
  };

  if (loading || loadingGroups) {
    return <div>Loading data...</div>;
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Combine category data with spending data
  const getCategorySpending = (categoryName: string): number => {
    const spendingItem = categorySpending.find(item => item.category === categoryName);
    return spendingItem ? spendingItem.amount : 0;
  };

  // Find "No category" spending if it exists
  const noCategorySpending = categorySpending.find(item => item.category === 'No category');

  // Get categories with no group
  const ungroupedCategories = categories.filter(category => !category.group_id);
  const ungroupedTotalSpending = ungroupedCategories.reduce((sum, category) => sum + getCategorySpending(category.name), 0);

  // Get categories grouped by their group
  const categoriesByGroup = categoryGroups.map(group => {
    const groupCategories = categories.filter(category => category.group_id === group.id);
    return {
      group,
      categories: groupCategories,
      totalSpending: groupCategories.reduce((sum, category) => sum + getCategorySpending(category.name), 0)
    };
  });

  return (
    <div className="categories-list">
      <h1>Categories</h1>

      {error && <div className="error">{error}</div>}
      {spendingError && <div className="error">{spendingError}</div>}
      {groupsError && <div className="error">{groupsError}</div>}

      {/* Loading overlay for drag and drop operations */}
      {isUpdatingGroup && (
        <div className="drag-loading-overlay">
          <div className="drag-loading-message">
            Moving category to new group...
          </div>
        </div>
      )}

      {/* Loading overlay for group reordering operations */}
      {isReorderingGroups && (
        <div className="drag-loading-overlay">
          <div className="drag-loading-message">
            Reordering category groups...
          </div>
        </div>
      )}

      <div className={`categories-container ${draggedCategory ? 'dragging-category' : ''} ${draggedGroup ? 'dragging-group' : ''}`}>
        {/* Category Groups Management Section */}
        <div className="category-groups-section">
          <h2>Category Groups</h2>

          <div className="groups-actions">
            <button
              onClick={() => setAllCollapsed(prev => !prev)}
              className="small"
            >
              {allCollapsed ? 'Expand All' : 'Collapse All'}
            </button>
          </div>

          <div className="category-groups-list">
            {categoryGroups.length === 0 ? (
              <p>No category groups found. Create your first group below.</p>
            ) : (
              <table className="category-groups-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Categories</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryGroups.map((group, index) => (
                    <tr
                      key={group.id}
                      draggable={editingGroupId !== group.id}
                      onDragStart={(e) => handleGroupDragStart(group, index, e)}
                      onDragEnd={handleGroupDragEnd}
                      onDragOver={(e) => handleGroupDragOver(index, e)}
                      onDragLeave={handleGroupDragLeave}
                      onDrop={(e) => handleGroupDrop(index, e)}
                      className={`
                        ${draggedGroup?.id === group.id ? 'dragging' : ''}
                        ${dragOverGroupPosition === index ? 'drag-over' : ''}
                      `}
                    >
                      <td>
                        {editingGroupId === group.id ? (
                          <input
                            type="text"
                            value={editGroupName}
                            onChange={(e) => setEditGroupName(e.target.value)}
                            className="edit-input"
                          />
                        ) : (
                          group.name
                        )}
                      </td>
                      <td>
                        {editingGroupId === group.id ? (
                          <input
                            type="text"
                            value={editGroupDescription}
                            onChange={(e) => setEditGroupDescription(e.target.value)}
                            className="edit-input"
                            placeholder="Description (optional)"
                          />
                        ) : (
                          group.description || '-'
                        )}
                      </td>
                      <td>
                        {categories.filter(c => c.group_id === group.id).length}
                      </td>
                      <td>
                        {editingGroupId === group.id ? (
                          <div className="edit-actions">
                            <button
                              onClick={() => handleSaveEditGroup(group.id)}
                              disabled={savingGroup}
                            >
                              {savingGroup ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancelEditGroup}
                              disabled={savingGroup}
                              className="secondary"
                            >
                              Cancel
                            </button>
                            {editGroupError && <div className="error small">{editGroupError}</div>}
                          </div>
                        ) : (
                          <div className="row-actions">
                            <button
                              onClick={() => handleStartEditGroup(group)}
                              className="small"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCategoryGroup(group.id)}
                              className="small danger"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => {
                                const newCollapsed = new Set(collapsedGroups);
                                if (collapsedGroups.has(group.id)) {
                                  newCollapsed.delete(group.id);
                                } else {
                                  newCollapsed.add(group.id);
                                }
                                setCollapsedGroups(newCollapsed);
                              }}
                              className="small"
                              title={collapsedGroups.has(group.id) ? "Expand" : "Collapse"}
                            >
                              {collapsedGroups.has(group.id) ? '▼' : '▲'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="new-group-form">
            <h3>Create New Group</h3>

            {createGroupError && <div className="error">{createGroupError}</div>}

            <form onSubmit={handleCreateCategoryGroup}>
              <div className="form-group">
                <label htmlFor="group-name">Name</label>
                <input
                  type="text"
                  id="group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="group-description">Description (Optional)</label>
                <input
                  type="text"
                  id="group-description"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Enter a description"
                />
              </div>

              <div className="form-actions">
                <button type="submit" disabled={creatingGroup}>
                  {creatingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="categories-grid">
          <h2>Categories and Spending</h2>

          {(loading || loadingSpending) ? (
            <div>Loading data...</div>
          ) : categories.length === 0 && categorySpending.length === 0 ? (
            <p>No categories or spending data found. Create your first category below.</p>
          ) : (
            <>
              {/* Categories with no group */}
              <div
                className={`category-group ${dragOverGroupId === null ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(null, e)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(null, e)}
              >
                <h3>Ungrouped Categories</h3>
                <div className="group-total">Total: {formatCurrency(ungroupedTotalSpending)}</div>
                <table className="categories-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Amount Spent</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ungroupedCategories.length === 0 ? (
                      <tr>
                        <td colSpan={4}>No ungrouped categories</td>
                      </tr>
                    ) : (
                      ungroupedCategories.map(category => (
                        <tr
                          key={category.id}
                          draggable={editingCategoryId !== category.id}
                          onDragStart={(e) => handleDragStart(category, e)}
                          onDragEnd={handleDragEnd}
                          className={draggedCategory?.id === category.id ? 'dragging' : ''}
                        >
                          <td>
                            {editingCategoryId === category.id ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="edit-input"
                              />
                            ) : (
                              category.name
                            )}
                          </td>
                          <td>
                            {editingCategoryId === category.id ? (
                              <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="edit-input"
                                placeholder="Description (optional)"
                              />
                            ) : (
                              category.description || '-'
                            )}
                          </td>
                          <td className="amount">{formatCurrency(getCategorySpending(category.name))}</td>
                          <td>
                            {editingCategoryId === category.id ? (
                              <div className="edit-actions">
                                <div className="form-group">
                                  <label htmlFor="edit-group">Group</label>
                                  <select
                                    id="edit-group"
                                    value={editGroupId || ""}
                                    onChange={(e) => setEditGroupId(e.target.value === "" ? undefined : e.target.value)}
                                    className="edit-input"
                                  >
                                    <option value="">No Group</option>
                                    {categoryGroups.map(group => (
                                      <option key={group.id} value={group.id}>{group.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <button
                                  onClick={() => handleSaveEdit(category.id)}
                                  disabled={saving}
                                >
                                  {saving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={saving}
                                  className="secondary"
                                >
                                  Cancel
                                </button>
                                {editError && <div className="error small">{editError}</div>}
                              </div>
                            ) : (
                              <div className="row-actions">
                                <button
                                  onClick={() => handleStartEdit(category)}
                                  className="small"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="small danger"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Categories grouped by their group */}
              {categoriesByGroup.map(({ group, categories: groupCategories, totalSpending }) => (
                <div
                  key={group.id}
                  className={`category-group ${dragOverGroupId === group.id ? 'drag-over' : ''} ${collapsedGroups.has(group.id) ? 'collapsed' : ''}`}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(group.id, e)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(group.id, e)}
                >
                  <div className="group-header">
                    <h3>{group.name}</h3>
                    <button
                      className="collapse-toggle"
                      onClick={() => {
                        const newCollapsed = new Set(collapsedGroups);
                        if (collapsedGroups.has(group.id)) {
                          newCollapsed.delete(group.id);
                        } else {
                          newCollapsed.add(group.id);
                        }
                        setCollapsedGroups(newCollapsed);
                      }}
                      title={collapsedGroups.has(group.id) ? "Expand" : "Collapse"}
                    >
                      {collapsedGroups.has(group.id) ? '▼' : '▲'}
                    </button>
                  </div>
                  {group.description && <p className="group-description">{group.description}</p>}
                  <div className="group-total">Total: {formatCurrency(totalSpending)}</div>
                  <div className="group-content">
                    <table className="categories-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Description</th>
                          <th>Amount Spent</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupCategories.length === 0 ? (
                          <tr>
                            <td colSpan={4}>No categories in this group</td>
                          </tr>
                        ) : (
                          groupCategories.map(category => (
                            <tr
                              key={category.id}
                              draggable={editingCategoryId !== category.id}
                              onDragStart={(e) => handleDragStart(category, e)}
                              onDragEnd={handleDragEnd}
                              className={draggedCategory?.id === category.id ? 'dragging' : ''}
                            >
                              <td>
                                {editingCategoryId === category.id ? (
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="edit-input"
                                  />
                                ) : (
                                  category.name
                                )}
                              </td>
                              <td>
                                {editingCategoryId === category.id ? (
                                  <input
                                    type="text"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="edit-input"
                                    placeholder="Description (optional)"
                                  />
                                ) : (
                                  category.description || '-'
                                )}
                              </td>
                              <td className="amount">{formatCurrency(getCategorySpending(category.name))}</td>
                              <td>
                                {editingCategoryId === category.id ? (
                                  <div className="edit-actions">
                                    <div className="form-group">
                                      <label htmlFor="edit-group">Group</label>
                                      <select
                                        id="edit-group"
                                        value={editGroupId || ""}
                                        onChange={(e) => setEditGroupId(e.target.value === "" ? undefined : e.target.value)}
                                        className="edit-input"
                                      >
                                        <option value="">No Group</option>
                                        {categoryGroups.map(group => (
                                          <option key={group.id} value={group.id}>{group.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <button
                                      onClick={() => handleSaveEdit(category.id)}
                                      disabled={saving}
                                    >
                                      {saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      disabled={saving}
                                      className="secondary"
                                    >
                                      Cancel
                                    </button>
                                    {editError && <div className="error small">{editError}</div>}
                                  </div>
                                ) : (
                                  <div className="row-actions">
                                    <button
                                      onClick={() => handleStartEdit(category)}
                                      className="small"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCategory(category.id)}
                                      className="small danger"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* "No category" row if it exists in spending data */}
              {noCategorySpending && (
                <div className="category-group">
                  <h3>Transactions Without Category</h3>
                  <table className="categories-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Amount Spent</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="no-category-row">
                        <td>No category</td>
                        <td>Transactions without assigned category</td>
                        <td className="amount">{formatCurrency(noCategorySpending.amount)}</td>
                        <td>-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <div className="new-category-form">
          <h2>Create New Category</h2>

          {createError && <div className="error">{createError}</div>}

          <form onSubmit={handleCreateCategory}>
            <div className="form-group">
              <label htmlFor="category-name">Name</label>
              <input
                type="text"
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category-description">Description (Optional)</label>
              <input
                type="text"
                id="category-description"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Enter a description"
              />
            </div>

            <div className="form-group">
              <label htmlFor="category-group">Group (Optional)</label>
              <select
                id="category-group"
                value={newCategoryGroupId || ""}
                onChange={(e) => setNewCategoryGroupId(e.target.value === "" ? undefined : e.target.value)}
              >
                <option value="">No Group</option>
                {categoryGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CategoriesList;
