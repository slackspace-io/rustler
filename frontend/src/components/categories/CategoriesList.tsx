import { useState, useEffect } from 'react';
import { categoriesApi } from '../../services/api';
import type { Category } from '../../services/api';
import './Categories.css';

const CategoriesList = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
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

  return (
    <div className="categories-list">
      <h1>Categories</h1>

      {error && <div className="error">{error}</div>}

      <div className="categories-container">
        <div className="categories-grid">
          <h2>Manage Categories</h2>

          {categories.length === 0 ? (
            <p>No categories found. Create your first category below.</p>
          ) : (
            <table className="categories-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
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
