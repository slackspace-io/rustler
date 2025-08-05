import { useState, useEffect } from 'react';
import { categoriesApi } from '../../services/api';
import type { Category, CategorySpending } from '../../services/api';
import './Categories.css';

const CategoriesList = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for category spending
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [loadingSpending, setLoadingSpending] = useState(true);
  const [spendingError, setSpendingError] = useState<string | null>(null);

  // State for new category form
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // State for editing
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch categories and spending on component mount
  useEffect(() => {
    fetchCategories();
    fetchCategorySpending();
  }, []);

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
        description: newCategoryDescription.trim() || undefined
      });

      setCategories(prevCategories => [...prevCategories, newCategory]);

      // Reset form
      setNewCategoryName('');
      setNewCategoryDescription('');
      setCreating(false);
    } catch (err) {
      console.error('Error creating category:', err);
      setCreateError('Failed to create category');
      setCreating(false);
    }
  };

  const handleStartEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditName(category.name);
    setEditDescription(category.description || '');
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditName('');
    setEditDescription('');
    setEditError(null);
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
        description: editDescription.trim() || undefined
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

  if (loading) {
    return <div>Loading categories...</div>;
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

  return (
    <div className="categories-list">
      <h1>Categories</h1>

      {error && <div className="error">{error}</div>}
      {spendingError && <div className="error">{spendingError}</div>}

      <div className="categories-container">
        <div className="categories-grid">
          <h2>Categories and Spending</h2>

          {(loading || loadingSpending) ? (
            <div>Loading data...</div>
          ) : categories.length === 0 && categorySpending.length === 0 ? (
            <p>No categories or spending data found. Create your first category below.</p>
          ) : (
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
                {/* Regular categories */}
                {categories.map(category => (
                  <tr key={category.id}>
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
                ))}

                {/* "No category" row if it exists in spending data */}
                {noCategorySpending && (
                  <tr className="no-category-row">
                    <td>No category</td>
                    <td>Transactions without assigned category</td>
                    <td className="amount">{formatCurrency(noCategorySpending.amount)}</td>
                    <td>-</td>
                  </tr>
                )}

                {/* Show message if no data */}
                {categories.length === 0 && !noCategorySpending && (
                  <tr>
                    <td colSpan={4}>No categories or spending data available</td>
                  </tr>
                )}
              </tbody>
            </table>
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
