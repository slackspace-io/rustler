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
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
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
    // Reset selected index when filtered categories change
    setSelectedIndex(-1);
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
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  const handleSelectCategory = (categoryName: string) => {
    onChange(categoryName);
    setShowSuggestions(false);
    setSelectedIndex(-1);
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
      setSelectedIndex(-1);
    } else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault();
      if (filteredCategories.length > 0) {
        setSelectedIndex(prev => (prev < filteredCategories.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Tab' && showSuggestions && selectedIndex >= 0) {
      e.preventDefault();
      if (filteredCategories[selectedIndex]) {
        handleSelectCategory(filteredCategories[selectedIndex].name);
        // Move focus to the next form field
        const form = inputRef.current?.form;
        if (form) {
          const inputs = Array.from(form.elements) as HTMLElement[];
          const currentIndex = inputs.indexOf(inputRef.current as HTMLElement);
          if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
            (inputs[currentIndex + 1] as HTMLElement).focus();
          }
        }
      }
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
              {filteredCategories.map((category, index) => (
                <div
                  key={category.id}
                  className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleSelectCategory(category.name)}
                  onMouseEnter={() => setSelectedIndex(index)}
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
