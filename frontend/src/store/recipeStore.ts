import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language } from '@/constants/i18n';

// Recipe data types matching backend JSON schema
export interface Ingredient {
  name_en: string;
  name_hk: string;
  quantity: string;
  optional: boolean;
  category?: string; // e.g. "Produce", "Pantry"
}

export interface PrepTask {
  task_en: string;
  task_hk: string;
  video_timestamp?: string;
  is_time_sensitive: boolean;
}



export interface VisualVerification {
  status: 'confirmed' | 'inferred' | 'ambiguous';
  confidence: number;
  details: string;
  fallback_note: string | null;
}

export interface TimerConfig {
  has_timer: boolean;
  duration_seconds: number | null;
  visual_cue: string | null;
}

export interface RecipeStep {
  step_id: number;
  timestamp_start: string;
  timestamp_end: string;
  instruction_en: string;
  instruction_hk: string;
  visual_verification: VisualVerification;
  timer_config: TimerConfig;
}

export interface RecipeMeta {
  title_en: string;
  title_hk: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  total_time_minutes: number;
  servings: number;
}

export interface CostEstimate {
  total_tokens: number;
  estimated_cost_usd: number;
  savings_percent: number;
}

export interface Recipe {
  processing_status: 'success' | 'partial' | 'failed';
  youtube_id: string;
  frames_analyzed: number;
  cost_estimate: CostEstimate;
  recipe_meta: RecipeMeta;
  ingredients: Ingredient[];
  prep_tasks?: PrepTask[]; // "Mise en place" tasks

  steps: RecipeStep[];
  error_message?: string;
}



// Store state
interface RecipeState {
  // Current recipe
  currentRecipe: Recipe | null;
  isLoading: boolean;
  error: string | null;
  
  // Navigation
  currentStepIndex: number;
  mode: 'ingredients' | 'prep' | 'cook'; // Updated modes
  

  
  // Cook mode
  isTimerRunning: boolean;
  timerSeconds: number;
  showExplainability: boolean;
  
  // Voice control
  isListening: boolean;
  
  // Settings
  expertMode: boolean;
  language: Language;
  
  // Actions
  setRecipe: (recipe: Recipe) => void;
  clearRecipe: () => void;
  setMode: (mode: 'ingredients' | 'prep' | 'cook') => void;
  
  // Step navigation
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  

  
  // Timer actions
  startTimer: (seconds: number) => void;
  stopTimer: () => void;
  tickTimer: () => void;
  
  // UI toggles
  toggleExplainability: () => void;
  setListening: (listening: boolean) => void;
  toggleExpertMode: () => void;
  setLanguage: (lang: Language) => void;
}

export const useRecipeStore = create<RecipeState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentRecipe: null,
      isLoading: false,
      error: null,
      currentStepIndex: 0,
      mode: 'ingredients', // Start with Ingredients mode

      isTimerRunning: false,
      timerSeconds: 0,
      showExplainability: false,
      isListening: false,
      expertMode: false,
      language: (typeof window !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')) ? 'hk' : 'en',

      // Recipe actions
      setRecipe: (recipe) => set({ 
        currentRecipe: recipe, 
        currentStepIndex: 0,
        error: null
      }),
      
      clearRecipe: () => set({ 
        currentRecipe: null, 
        currentStepIndex: 0 
      }),
      
      setMode: (mode) => set({ mode }),

      // Step navigation
      nextStep: () => {
        const { currentRecipe, currentStepIndex } = get();
        if (currentRecipe && currentStepIndex < currentRecipe.steps.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 });
        }
      },
      
      prevStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 });
        }
      },
      
      goToStep: (index) => {
        const { currentRecipe } = get();
        if (currentRecipe && index >= 0 && index < currentRecipe.steps.length) {
          set({ currentStepIndex: index });
        }
      },



      // Timer actions
      startTimer: (seconds) => set({ 
        timerSeconds: seconds, 
        isTimerRunning: true 
      }),
      
      stopTimer: () => set({ 
        isTimerRunning: false 
      }),
      
      tickTimer: () => {
        const { timerSeconds, isTimerRunning } = get();
        if (isTimerRunning && timerSeconds > 0) {
          set({ timerSeconds: timerSeconds - 1 });
        } else if (isTimerRunning && timerSeconds === 0) {
          set({ isTimerRunning: false });
          // Timer done - trigger TTS
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance('時間到啦！');
            utterance.lang = 'zh-HK';
            window.speechSynthesis.speak(utterance);
          }
        }
      },

      // UI toggles
      toggleExplainability: () => set(state => ({ 
        showExplainability: !state.showExplainability 
      })),
      
      setListening: (listening) => set({ isListening: listening }),
      
      toggleExpertMode: () => set(state => ({ 
        expertMode: !state.expertMode 
      })),

      setLanguage: (lang: Language) => set({ language: lang }),
    }),
    {
      name: 'woktalk-storage',
      partialize: (state) => ({ 

        expertMode: state.expertMode,
        language: state.language
      }),
    }
  )
);
