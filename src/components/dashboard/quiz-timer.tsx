
"use client";

import { useState, useEffect, useRef } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizTimerProps {
  durationMinutes: number;
  onTimeUp: () => void;
  isSubmitting: boolean;
}

export function QuizTimer({ durationMinutes, onTimeUp, isSubmitting }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isSubmitting || timeLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if(timerRef.current) clearInterval(timerRef.current);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onTimeUp, isSubmitting, timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const isLowTime = timeLeft <= 60;

  return (
    <div className="fixed top-[calc(50%_-_8rem)] right-4 md:right-8 transform -translate-y-1/2 z-50 animate-fade-in">
      <div 
        className={cn(
          "flex flex-col items-center gap-1 bg-card/60 backdrop-blur-sm p-3 rounded-full border shadow-lg transition-colors",
          isLowTime && "border-destructive/50 text-destructive animate-pulse"
        )}
      >
        <Timer className="h-5 w-5" />
        <span className="font-mono font-bold text-lg tracking-wider">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
