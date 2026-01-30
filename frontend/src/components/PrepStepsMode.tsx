'use client';

import { useState } from 'react';
import { useRecipeStore } from '@/store/recipeStore';
import WokIcon from './WokIcon';
import YouTubePlayer from './YouTubePlayer';
import { MESSAGES } from '@/constants/i18n';

export default function PrepStepsMode() {
  const { currentRecipe, setMode, language } = useRecipeStore();
  const t = MESSAGES[language];
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});
  const [activeVideoTask, setActiveVideoTask] = useState<number | null>(null);

  if (!currentRecipe || !currentRecipe.prep_tasks) {
      // Fallback if no prep tasks defined
      return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <h2 className="text-xl text-white mb-4">No specific prep tasks for this recipe.</h2>
              <button onClick={() => setMode('cook')} className="btn-primary">
                  Start Cooking
              </button>
          </div>
      )
  }

  const toggleTask = (index: number) => {
    setCompletedTasks(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const allDone = currentRecipe.prep_tasks.every((_, i) => completedTasks[i]);

  return (
    <div className="flex flex-col h-full bg-wok-coal text-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-6 ">
        <h2 className="text-grease-lg font-semibold mb-1">
          {language === 'hk' ? (
            <>洗切 <span className="text-wok-steam/40 text-base font-normal ml-2">Prep</span></>
          ) : (
            <>Prep <span className="text-wok-steam/40 text-base font-normal ml-2 font-chinese">洗切</span></>
          )}
        </h2>
        <p className="text-wok-steam/60">{t.prepSubtitle}</p>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="space-y-4 max-w-2xl mx-auto">
          {currentRecipe.prep_tasks.map((task, i) => (
            <div 
              key={i} 
              className={`
                bg-wok-soy/10 rounded-xl overflow-hidden border transition-all
                ${completedTasks[i] ? 'border-wok-jade/30 opacity-60' : 'border-wok-steam/10'}
              `}
            >
                {/* Task Content */}
                <div className="p-4 flex gap-4">
                    {/* Checkbox */}
                    <button 
                        onClick={() => toggleTask(i)}
                        className={`
                            flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all mt-1
                            ${completedTasks[i] ? 'bg-wok-jade border-wok-jade' : 'border-wok-steam/40 hover:border-wok-flame'}
                        `}
                    >
                        {completedTasks[i] && <span className="text-wok-coal font-bold">✓</span>}
                    </button>

                    <div className="flex-1">
                      {language === 'hk' ? (
                        <>
                          <h3 className={`text-lg font-chinese font-medium mb-0.5 ${completedTasks[i] ? 'line-through text-wok-jade/60' : 'text-white'}`}>
                            {task.task_hk}
                          </h3>
                          <p className={`text-sm ${completedTasks[i] ? 'line-through text-wok-jade/40' : 'text-wok-steam/60'}`}>
                            {task.task_en}
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className={`text-lg font-medium mb-0.5 ${completedTasks[i] ? 'line-through text-wok-jade/60' : 'text-white'}`}>
                            {task.task_en}
                          </h3>
                          <p className={`text-sm font-chinese ${completedTasks[i] ? 'line-through text-wok-jade/40' : 'text-wok-steam/60'}`}>
                            {task.task_hk}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Video Toggle */}
                    {task.video_timestamp && (
                        <button 
                            onClick={() => setActiveVideoTask(activeVideoTask === i ? null : i)}
                            className={`
                                flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors
                                ${activeVideoTask === i ? 'bg-wok-flame text-white' : 'bg-wok-soy/30 text-wok-steam/60 hover:text-white'}
                            `}
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                    )}
                </div>

                {/* Video Player (Collapsible) */}
                {activeVideoTask === i && task.video_timestamp && (
                    <div className="mx-4 mb-4 rounded-lg overflow-hidden bg-black aspect-video relative">
                        <YouTubePlayer 
                            videoId={currentRecipe.youtube_id}
                            startTime={task.video_timestamp}
                            autoLoop={true}
                        />
                    </div>
                )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-6 border-t border-wok-steam/10 bg-wok-coal/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
               <div className="text-sm text-wok-steam/60">
                   {t.itemsReady(Object.keys(completedTasks).length, currentRecipe.prep_tasks.length)}
               </div>
               <button 
                onClick={() => setMode('cook')}
                className={`
                    px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all
                    ${allDone 
                        ? 'bg-wok-flame text-white shadow-[0_0_20px_rgba(255,87,34,0.3)] scale-105' 
                        : 'bg-wok-soy/20 text-wok-steam/60 hover:text-white'
                    }
                `}
               >
                   <WokIcon className="w-5 h-5" />
                    {t.startCooking}
               </button>
          </div>
      </div>
    </div>
  );
}
