
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
  const totalDurationSeconds = durationMinutes * 60;
  const [timeLeft, setTimeLeft] = useState(totalDurationSeconds);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Effect for countdown logic
  useEffect(() => {
    if (isSubmitting) {
      return;
    }

    if (timeLeft <= 0) {
      // Use the ref to call the latest version of the function
      // This prevents the state update during render error.
      onTimeUpRef.current();
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [isSubmitting, timeLeft]);


  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const timerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (timerRef.current) {
        const initialX = window.innerWidth - timerRef.current.offsetWidth - 32;
        const initialY = (window.innerHeight - timerRef.current.offsetHeight) / 2;
        setPosition({ x: initialX, y: initialY });
        setIsInitialized(true);
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timerRef.current) return;
    setIsDragging(true);
    const rect = timerRef.current.getBoundingClientRect();
    offsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    e.preventDefault();
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      setPosition({
        x: e.clientX - offsetRef.current.x,
        y: e.clientY - offsetRef.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const isLowTime = timeLeft <= 10 && timeLeft > 0;

  // Show for first 10s, then hide, then show for last 59s
  const isVisible = (totalDurationSeconds - timeLeft < 10) || (timeLeft < 60);
  if (!isVisible && !isSubmitting) return null;


  return (
    <div
      ref={timerRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "fixed z-50 animate-fade-in",
        isInitialized ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div 
        className={cn(
          "flex flex-col items-center gap-1 bg-card/70 backdrop-blur-sm p-4 rounded-full border-2 shadow-lg transition-colors",
          isLowTime 
            ? "border-destructive/80 text-destructive animate-pulse"
            : "border-green-500/50 text-green-500"
        )}
      >
        <Timer className="h-6 w-6" />
        <span className="font-mono font-bold text-xl tracking-wider">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
