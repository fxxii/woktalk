'use client';

import { useEffect, useRef, useState } from 'react';
import { useRecipeStore } from '@/store/recipeStore';
import YouTubePlayer from './YouTubePlayer';
import VoiceControl from './VoiceControl';
import Settings from './Settings';
import { MESSAGES } from '@/constants/i18n';

export default function CookMode() {
  const {
    currentRecipe,
    currentStepIndex,
    showExplainability,
    isTimerRunning,
    timerSeconds,
    expertMode,
    language,
    nextStep,
    prevStep,
    goToStep,
    toggleExplainability,
    startTimer,
    stopTimer,
    tickTimer,
  } = useRecipeStore();

  const playerRef = useRef<{ replay: () => void } | null>(null);
  const t = MESSAGES[language];

  // Timer tick effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        tickTimer();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, tickTimer]);

  if (!currentRecipe) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-wok-steam/60">{t.noRecipe}</p>
      </div>
    );
  }

  const currentStep = currentRecipe.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === currentRecipe.steps.length - 1;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceBadge = () => {
    const verification = currentStep.visual_verification;
    const confidence = verification.confidence;

    if (confidence >= 0.9) {
      return <span className="badge-confirmed">{t.confirmed}</span>;
    } else if (confidence >= 0.7) {
      return <span className="badge-ambiguous">{t.verify}</span>;
    } else {
      return <span className="badge-warning">{t.uncertain}</span>;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Left: Video Player (Desktop) */}
      <div className="lg:w-1/2 lg:h-full lg:overflow-hidden flex-shrink-0">
        <div className="aspect-video lg:aspect-auto lg:h-full p-4 lg:p-6">
          <YouTubePlayer
            ref={playerRef}
            videoId={currentRecipe.youtube_id}
            startTime={currentStep.timestamp_start}
            endTime={currentStep.timestamp_end}
            autoLoop={true}
            className="h-full"
          />
        </div>
      </div>

      {/* Right: Command Center */}
      <div className="lg:w-1/2 flex flex-col p-4 lg:p-8 overflow-y-auto">
        {/* Step Progress */}
        <div className="flex items-center gap-4 mb-6">
          <span className="step-badge">{currentStep.step_id}</span>
          <div className="flex-1">
            <div className="flex justify-between text-sm text-wok-steam/60 mb-1">
              <span>{t.stepOf(currentStepIndex + 1, currentRecipe.steps.length)}</span>
              <span>{currentStep.timestamp_start} - {currentStep.timestamp_end}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill"
                style={{ width: `${((currentStepIndex + 1) / currentRecipe.steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Instruction */}
        <div className="card mb-6">
          {language === 'hk' ? (
            <>
              <p className="text-grease-xl font-chinese text-white text-center mb-4">
                {currentStep.instruction_hk}
              </p>
              <p className="text-grease-base text-wok-steam/70 text-center">
                {currentStep.instruction_en}
              </p>
            </>
          ) : (
            <>
              <p className="text-grease-xl text-white text-center mb-4">
                {currentStep.instruction_en}
              </p>
              <p className="text-grease-base font-chinese text-wok-steam/70 text-center">
                {currentStep.instruction_hk}
              </p>
            </>
          )}
        </div>

        {/* Confidence Badge & Explainability - Only show in Expert Mode */}
        {expertMode && (
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              {getConfidenceBadge()}
              <button 
                onClick={toggleExplainability}
                className="text-sm text-wok-steam/40 hover:text-wok-steam transition-colors"
                aria-label={showExplainability ? t.hide : t.why}
              >
                {showExplainability ? t.hide : t.why}
              </button>
            </div>
            
            {showExplainability && (
              <div className="w-full p-4 rounded-xl bg-wok-soy/20 border border-wok-steam/10 text-sm">
                <p className="text-wok-steam/60 mb-2">
                  <strong>Status:</strong> {currentStep.visual_verification.status}
                </p>
                <p className="text-wok-steam/60 mb-2">
                  <strong>Confidence:</strong> {(currentStep.visual_verification.confidence * 100).toFixed(0)}%
                </p>
                <p className="text-wok-steam/60">
                  <strong>Details:</strong> {currentStep.visual_verification.details}
                </p>
                {currentStep.visual_verification.fallback_note && (
                  <p className="text-wok-ginger mt-2">
                    ⚠ {currentStep.visual_verification.fallback_note}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Timer */}
        {currentStep.timer_config.has_timer && (
          <div className="card flex flex-col items-center mb-6">
            <span className="timer-display mb-4">
              {isTimerRunning 
                ? formatTime(timerSeconds)
                : formatTime(currentStep.timer_config.duration_seconds || 0)
              }
            </span>
            <div className="flex gap-4">
              {!isTimerRunning ? (
                <button 
                  onClick={() => startTimer(currentStep.timer_config.duration_seconds || 60)}
                  className="btn-primary"
                >
                  {t.startTimer}
                </button>
              ) : (
                <button onClick={stopTimer} className="btn-secondary">
                  {t.stopTimer}
                </button>
              )}
            </div>
            {currentStep.timer_config.visual_cue && (
              <p className="mt-4 text-sm text-wok-ginger text-center">
                👀 {t.lookFor} {currentStep.timer_config.visual_cue}
              </p>
            )}
          </div>
        )}

        {/* Visual Cue (if no timer) */}
        {!currentStep.timer_config.has_timer && currentStep.timer_config.visual_cue && (
          <div className="card text-center mb-6">
            <p className="text-wok-ginger">
              👀 {currentStep.timer_config.visual_cue}
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-auto">
          <button 
            onClick={prevStep}
            disabled={isFirstStep}
            className="btn-ghost flex-1 text-grease-lg"
          >
            ← {t.prev}
          </button>
          <button
            onClick={() => playerRef.current?.replay()}
            className="btn-secondary px-8 flex items-center justify-center group/replay"
            aria-label="Replay video"
          >
            <svg 
              className="w-10 h-10 text-wok-ginger transform transition-transform group-hover/replay:rotate-[-45deg]" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button
            onClick={nextStep}
            disabled={isLastStep}
            className="btn-primary flex-1 text-grease-lg"
          >
            {t.next} →
          </button>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 mt-6">
          {currentRecipe.steps.map((_, index) => (
            <button
              key={index}
              onClick={() => goToStep(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentStepIndex 
                  ? 'bg-wok-flame' 
                  : index < currentStepIndex 
                    ? 'bg-wok-jade' 
                    : 'bg-wok-steam/20'
              }`}
            />
          ))}
        </div>

        {/* Completion */}
        {isLastStep && (
          <div className="mt-8 text-center">
            <p className="text-grease-lg text-wok-jade font-chinese">
              {t.finished}
            </p>
          </div>
        )}
      </div>

      {/* Voice Control */}
      <VoiceControl />
    </div>
  );
}
