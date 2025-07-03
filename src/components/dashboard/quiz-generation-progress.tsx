
"use client";

import { useState, useEffect } from 'react';
import { Loader2, FileText, BrainCircuit, PencilRuler, CheckCircle as CheckCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const progressSteps = [
  { text: "Analyzing document(s)...", icon: FileText },
  { text: "Identifying key topics and concepts...", icon: BrainCircuit },
  { text: "Drafting questions based on your settings...", icon: PencilRuler },
  { text: "Finalizing quiz...", icon: CheckCircleIcon },
];

export function QuizGenerationProgress() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timers = progressSteps.map((_, index) => 
      setTimeout(() => {
        setCurrentStep(index);
      }, index * 3000) 
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
      <Loader2 className="h-12 w-12 text-primary animate-spin mb-6" />
      <h2 className="text-xl font-semibold mb-4">Generating Your Quiz</h2>
      <p className="text-muted-foreground mb-8">This may take a moment. Please don't close this window.</p>
      
      <div className="w-full max-w-sm space-y-4">
        {progressSteps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const Icon = step.icon;
          
          return (
            <div key={index} className="flex items-center space-x-4 transition-all duration-500">
              <div className={cn(
                "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                isActive && "bg-primary/20 text-primary ring-2 ring-primary/50"
              )}>
                {isCompleted ? <CheckCircleIcon className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <p className={cn(
                "font-medium transition-colors",
                isCompleted ? "text-muted-foreground line-through" : "text-foreground",
                isActive && "text-primary"
              )}>
                {step.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
