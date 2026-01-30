'use client';

import { useState } from 'react';
import { useRecipeStore } from '@/store/recipeStore';
import { MESSAGES } from '@/constants/i18n';

export default function Settings({ className = '' }: { className?: string }) {
  const { expertMode, toggleExpertMode, language, setLanguage } = useRecipeStore();
  const [isOpen, setIsOpen] = useState(false);
  const t = MESSAGES[language];

  return (
    <div className={`relative ${className}`}>
      {/* Settings button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl bg-wok-soy/30 border border-wok-steam/20 hover:bg-wok-soy/50 transition-all flex items-center justify-center"
        aria-label={t.settings}
      >
        <svg 
          className="w-6 h-6 text-wok-steam" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
          />
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
          />
        </svg>
      </button>

      {/* Settings panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="fixed top-20 right-4 z-50 w-80 bg-wok-coal border-2 border-wok-steam/20 rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-semibold mb-6 text-wok-steam">{t.settings}</h2>
            
            <div className="space-y-8">
              {/* Language Switcher */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-medium text-wok-steam mb-1">
                    {t.language}
                  </h3>
                </div>
                
                <div className="flex bg-wok-soy/30 rounded-lg p-1 border border-wok-steam/10">
                  <button
                    onClick={() => setLanguage('hk')}
                    className={`px-3 py-1 rounded-md text-sm transition-all ${
                      language === 'hk' 
                        ? 'bg-wok-flame text-white shadow-lg' 
                        : 'text-wok-steam/60 hover:text-wok-steam'
                    }`}
                  >
                    繁中
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 rounded-md text-sm transition-all ${
                      language === 'en' 
                        ? 'bg-wok-flame text-white shadow-lg' 
                        : 'text-wok-steam/60 hover:text-wok-steam'
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              {/* Expert Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-medium text-wok-steam mb-1">
                    {t.expertMode}
                  </h3>
                  <p className="text-sm text-wok-steam/60">
                    {t.expertModeDesc}
                  </p>
                </div>
                
                <button
                  onClick={toggleExpertMode}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    expertMode ? 'bg-wok-jade' : 'bg-wok-steam/20'
                  }`}
                  aria-label="Toggle Expert Mode"
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      expertMode ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
