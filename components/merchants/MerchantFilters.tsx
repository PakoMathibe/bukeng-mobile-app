'use client';

interface MerchantFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const categories = ['all', 'Grocery', 'Restaurant', 'Pharmacy', 'Clothing'];

export function MerchantFilters({
  selectedCategory,
  onCategoryChange,
}: MerchantFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${
            selectedCategory === category
              ? 'bg-yellow-500 text-black'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {category === 'all' ? 'All' : category}
        </button>
      ))}
    </div>
  );
}
