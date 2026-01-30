'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRecipeStore } from '@/store/recipeStore';
import WokIcon from './WokIcon';
import { MESSAGES } from '@/constants/i18n';

export default function IngredientsMode() {
  const { currentRecipe, setMode, language } = useRecipeStore();
  const t = MESSAGES[language];
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  
  // Initialize with recipe default or 1
  const defaultServings = currentRecipe?.recipe_meta.servings || 1;
  const [currentServings, setCurrentServings] = useState(defaultServings);

  // Update if recipe changes
  useEffect(() => {
    if (currentRecipe?.recipe_meta.servings) {
      setCurrentServings(currentRecipe.recipe_meta.servings);
    }
  }, [currentRecipe]);

  if (!currentRecipe) return null;

  // Group ingredients logic (unchanged)
  const groupedIngredients = useMemo(() => {
    return currentRecipe.ingredients.reduce((acc, ing) => {
      const category = ing.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(ing);
      return acc;
    }, {} as Record<string, typeof currentRecipe.ingredients>);
  }, [currentRecipe.ingredients]);

  const handleToggle = (name: string) => {
    setCheckedItems(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Scaling Logic
  const getScaledQuantity = (quantity: string) => {
    if (currentServings === defaultServings) return quantity;

    // Simple regex to find numbers at start of string
    // e.g. "300g" -> match "300", "2 large" -> match "2"
    // Does not handle complex cases like "1/2 cup" well without library, but good for MVP
    const match = quantity.match(/^(\d+(\.\d+)?)(.*)/);
    
    if (match) {
      const num = parseFloat(match[1]);
      const suffix = match[3];
      const ratio = currentServings / defaultServings;
      
      // Calculate scaled amount
      const scaled = num * ratio;
      
      // Format pretty (avoid 3.000000001)
      const formatted = Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1);
      
      return `${formatted}${suffix}`;
    }
    
    return quantity; // Fallback for specific strings like "To taste"
  };

  const handleServingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (val > 0 && val < 50) {
      setCurrentServings(val);
    } else if (e.target.value === '') {
       // Allow empty while typing, handle blur/submit logic needed ideally or just default to 1 on blur
    }
  };

  // Progress logic (unchanged)
  const totalItems = currentRecipe.ingredients.length;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  // Category sort (unchanged)
  const categoryOrder = ['Produce', 'Meat', 'Seafood', 'Dairy', 'Pantry', 'Spices', 'Bakery', 'Other'];
  const sortedCategories = Object.keys(groupedIngredients).sort((a, b) => {
    const idxA = categoryOrder.indexOf(a);
    const idxB = categoryOrder.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-wok-coal">
      {/* Top Bar */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-wok-steam/10 bg-wok-coal/95 backdrop-blur z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-grease-lg font-semibold text-white">
            {language === 'hk' ? (
              <>買餸 <span className="text-wok-steam/40 text-base font-normal ml-2">Ingredients</span></>
            ) : (
              <>Ingredients <span className="text-wok-steam/40 text-base font-normal ml-2 font-chinese">買餸</span></>
            )}
          </h2>
          
          {/* Servings Control */}
          <div className="flex items-center gap-3 bg-wok-soy/30 rounded-lg p-2">
            <span className="text-xs text-wok-steam/60 uppercase tracking-wide">Servings</span>
            <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentServings(Math.max(1, currentServings - 1))}
                  className="w-6 h-6 rounded bg-wok-coal flex items-center justify-center hover:bg-wok-steam/20 text-white"
                >
                  -
                </button>
                <input 
                  type="number" 
                  value={currentServings}
                  onChange={handleServingsChange}
                  className="w-12 text-center bg-transparent text-white font-bold outline-none border-b border-wok-steam/20 focus:border-wok-flame"
                />
                <button 
                  onClick={() => setCurrentServings(currentServings + 1)}
                  className="w-6 h-6 rounded bg-wok-coal flex items-center justify-center hover:bg-wok-steam/20 text-white"
                >
                  +
                </button>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 w-full bg-wok-soy/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-wok-jade transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-wok-steam/60">
          <span>{t.itemsReady(checkedCount, totalItems)}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-6 max-w-2xl mx-auto">
          {sortedCategories.map(category => (
            <div key={category}>
                <h3 className="text-wok-steam/60 text-sm font-bold uppercase tracking-wider mb-3 px-1">{category}</h3>
                <div className="space-y-3">
                    {groupedIngredients[category].map((ing, i) => {
                        const isChecked = checkedItems[ing.name_en] || false;
                        return (
                        <div 
                            key={ing.name_en}
                            onClick={() => handleToggle(ing.name_en)}
                            className={`
                                group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer
                                ${isChecked 
                                ? 'bg-wok-jade/10 border-wok-jade/30' 
                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-wok-flame/30'
                                }
                            `}
                        >
                            {/* Checkbox */}
                            <div className={`
                                w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                                ${isChecked
                                ? 'bg-wok-jade border-wok-jade'
                                : 'border-wok-steam/40 group-hover:border-wok-flame'
                                }
                            `}>
                                {isChecked && (
                                <svg className="w-4 h-4 text-wok-coal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                  {language === 'hk' ? (
                                    <>
                                      <span className={`font-chinese text-lg ${isChecked ? 'text-wok-jade/60 line-through' : 'text-white font-medium'}`}>
                                        {ing.name_hk}
                                      </span>
                                      <span className={`text-sm ${isChecked ? 'text-wok-jade/40 line-through' : 'text-wok-steam/60'}`}>
                                        {ing.name_en}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className={`text-lg ${isChecked ? 'text-wok-jade line-through' : 'text-white font-medium'}`}>
                                        {ing.name_en}
                                      </span>
                                      <span className={`font-chinese text-sm ${isChecked ? 'text-wok-jade/40 line-through' : 'text-wok-steam/60'}`}>
                                        {ing.name_hk}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <div className="text-sm text-wok-steam/60">
                                {getScaledQuantity(ing.quantity)}
                                {ing.optional && <span className="ml-2 text-wok-steam/40 italic">(optional)</span>}
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="flex-shrink-0 p-6 border-t border-wok-steam/10 bg-wok-coal/95 backdrop-blur">
        <button 
          onClick={() => setMode('prep')}
          className={`
            w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all
            ${progress === 100 
              ? 'bg-wok-flame text-white hover:bg-wok-flame/90 shadow-[0_0_20px_rgba(255,87,34,0.3)]' 
              : 'bg-wok-soy/20 text-wok-steam/40 hover:bg-wok-soy/30 hover:text-wok-steam'
            }
          `}
        >
          {t.startPrep}
        </button>
      </div>
    </div>
  );
}
