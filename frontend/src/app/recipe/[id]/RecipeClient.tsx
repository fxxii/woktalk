'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeStore, Recipe } from '@/store/recipeStore';
import { MESSAGES } from '@/constants/i18n';
import IngredientsMode from '@/components/IngredientsMode';
import PrepStepsMode from '@/components/PrepStepsMode';
import CookMode from '@/components/CookMode';
import Settings from '@/components/Settings';
import WokIcon from '@/components/WokIcon';

interface RecipeClientProps {
  id: string;
}

export default function RecipeClient({ id: videoId }: RecipeClientProps) {
  const router = useRouter();
  const { currentRecipe, setRecipe, mode, setMode, expertMode, language } = useRecipeStore();
  const t = MESSAGES[language];
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecipe = async () => {
      // Check if already loaded
      if (currentRecipe?.youtube_id === videoId) {
        setIsLoading(false);
        return;
      }

      try {
        let data;
        
        // Handle demo recipe locally
        if (videoId === 'GNGGWBWkRbE') {
          const response = await fetch('/woktalk/demo_recipe.json'); // Add base path for GH Pages? 
          // Actually, let's keep it robust. If we are on GH Pages, we might need the prefix.
          // But fetch is relative to the domain root usually in browser.
          // If base path is set in next.config, assets are served from there.
          // Let's try relative path first, or handle the base path logic.
          
          // Better approach: try exact path first, fall back to base path if needed?
          // Or just use the prop passed.
          
          // Let's use a try/catch block or just assume standard fetch works if we put the file in public.
          // Next.js static export copies public folder to root (or base path).
          try {
             // Try root first (for localhost)
             let res = await fetch('/demo_recipe.json');
             if (!res.ok) {
                 // Try with base path (for GH Pages)
                 res = await fetch('/woktalk/demo_recipe.json');
             }
             if (!res.ok) throw new Error('Failed to load local demo recipe');
             data = await res.json();
          } catch (e) {
             throw new Error('Failed to load local demo recipe');
          }

          setRecipe(data as Recipe);
          setIsLoading(false);
          return;
        }

        // Try to fetch from API for other recipes
        const API_BASE = 'http://localhost:8000';
        const response = await fetch(`${API_BASE}/api/recipe/${videoId}`);
        
        if (!response.ok) {
          throw new Error('Recipe not found');
        }

        const apiResponse = await response.json();
        
        if (apiResponse.success && apiResponse.data) {
          setRecipe(apiResponse.data as Recipe);
        } else {
          throw new Error(apiResponse.error || 'Failed to load recipe');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recipe');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipe();
  }, [videoId, currentRecipe, setRecipe]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-flame mb-6">
          <WokIcon className="w-24 h-24" />
        </div>
        <p className="text-grease-lg text-wok-steam/60">Loading recipe...</p>
      </div>
    );
  }

  if (error || !currentRecipe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-6">😔</div>
        <h1 className="text-grease-xl font-semibold mb-4">Recipe Not Found</h1>
        <p className="text-wok-steam/60 mb-8">{error || 'This recipe does not exist.'}</p>
        <button onClick={() => router.push('/')} className="btn-primary">
          ← Back Home
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-wok-coal/95 backdrop-blur-sm border-b border-wok-steam/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Back & Title */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button 
                onClick={() => router.push('/')}
                className="btn-ghost p-2 flex-shrink-0"
              >
                ← 
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-semibold">
                    {currentRecipe.recipe_meta.title_en}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-wok-steam/60">
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      ⏱️ {currentRecipe.recipe_meta.total_time_minutes} {t.min}
                    </span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      👥 {currentRecipe.recipe_meta.servings} {t.servings}
                    </span>
                    <span className={`flex items-center gap-1 whitespace-nowrap ${
                      currentRecipe.recipe_meta.difficulty === 'Easy' ? 'text-wok-jade' :
                      currentRecipe.recipe_meta.difficulty === 'Medium' ? 'text-wok-ginger' :
                      'text-wok-chili'
                    }`}>
                      📊 {
                        currentRecipe.recipe_meta.difficulty === 'Easy' ? t.easy :
                        currentRecipe.recipe_meta.difficulty === 'Medium' ? t.medium :
                        t.hard
                      }
                    </span>
                    {expertMode && currentRecipe.cost_estimate && (
                      <span className="flex items-center gap-1 text-wok-jade whitespace-nowrap">
                        💰 ${currentRecipe.cost_estimate.estimated_cost_usd.toFixed(3)}
                        <span className="text-wok-steam/40">
                          ({currentRecipe.cost_estimate.savings_percent}% {t.saved})
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <p className="font-chinese text-wok-ginger text-sm">
                  {currentRecipe.recipe_meta.title_hk}
                </p>
              </div>
            </div>

            {/* Mode Toggle & Settings */}
            <div className="flex items-center gap-2">
              <div className="flex bg-wok-soy/30 rounded-xl p-1">
                <button
                  onClick={() => setMode('ingredients')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm ${
                    mode === 'ingredients' 
                      ? 'bg-wok-flame text-white' 
                      : 'text-wok-steam/60 hover:text-wok-steam'
                  }`}
                >
                  <span>🥬</span>
                  {t.ingredients}
                </button>
                <button
                  onClick={() => setMode('prep')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm ${
                    mode === 'prep' 
                      ? 'bg-wok-flame text-white' 
                      : 'text-wok-steam/60 hover:text-wok-steam'
                  }`}
                >
                  <span>🔪</span>
                  {t.prep}
                </button>
                <button
                  onClick={() => setMode('cook')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm ${
                    mode === 'cook' 
                      ? 'bg-wok-flame text-white' 
                      : 'text-wok-steam/60 hover:text-wok-steam'
                  }`}
                >
                  <WokIcon className="w-4 h-4" /> 
                  {t.cook}
                </button>
              </div>
              <Settings />
            </div>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {mode === 'ingredients' ? <IngredientsMode /> : 
         mode === 'prep' ? <PrepStepsMode /> : 
         <CookMode />}
      </main>
    </div>
  );
}
