import { useState, useEffect, useRef } from 'react';
import { categoriesApi } from '../../services/api';
import type { Category } from '../../services/api';
import './CategoryInput.css';

interface CategoryInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const CategoryInput: React.FC<CategoryInputProps> = ({
  value,
  onChange,
  placeholder = 'Select or create a category',
  className = '',
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch categories on component mount
  useEffect(() => {
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

    fetchCategories();
  }, []);

  // Filter categories based on input value
  useEffect(() => {
    if (value.trim() === '') {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(category =>
        category.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
  }, [value, categories]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleSelectCategory = (categoryName: string) => {
    onChange(categoryName);
    setShowSuggestions(false);
  };

  const handleCreateCategory = async () => {
    // Only create if the category doesn't already exist
    const categoryExists = categories.some(
      category => category.name.toLowerCase() === value.toLowerCase()
    );

    if (!categoryExists && value.trim() !== '') {
      try {
        const newCategory = await categoriesApi.createCategory({ name: value });
        setCategories(prevCategories => [...prevCategories, newCategory]);
        setShowSuggestions(false);
      } catch (err) {
        console.error('Error creating category:', err);
        setError('Failed to create category');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateCategory();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`category-input-container ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="category-input"
        autoComplete="off"
      />

      {showSuggestions && (
        <div ref={suggestionsRef} className="category-suggestions">
          {loading ? (
            <div className="suggestion-item loading">Loading categories...</div>
          ) : error ? (
            <div className="suggestion-item error">{error}</div>
          ) : filteredCategories.length > 0 ? (
            <>
              {filteredCategories.map(category => (
                <div
                  key={category.id}
                  className="suggestion-item"
                  onClick={() => handleSelectCategory(category.name)}
                >
                  {category.name}
                </div>
              ))}
            </>
          ) : (
            <div className="suggestion-item">
              <span>No matching categories. </span>
              <button
                className="create-category-btn"
                onClick={handleCreateCategory}
              >
                Create "{value}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryInput;
