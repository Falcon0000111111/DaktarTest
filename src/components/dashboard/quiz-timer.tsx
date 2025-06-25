
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

  // This effect manages the countdown interval
  useEffect(() => {
    if (isSubmitting) {
      return; // Stop timer if submitting
    }

    const timerId = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerId);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isSubmitting]);

  // This effect handles the "time is up" logic, separated from the interval to prevent render errors.
  useEffect(() => {
    if (timeLeft === 0) {
      onTimeUp();
    }
  }, [timeLeft, onTimeUp]);

  // --- Draggability Logic ---
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const timerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false); // To prevent flash of timer at 0,0

  // Initialize position on mount
  useEffect(() => {
    if (timerRef.current) {
        // Position on the right side, vertically centered
        const initialX = window.innerWidth - timerRef.current.offsetWidth - 32; // 32px for md:right-8
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
    e.preventDefault(); // prevent text selection
  };
  
  // Effect to add and remove global event listeners for dragging
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
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);


  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLowTime = timeLeft <= 60;

  return (
    <div
      ref={timerRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "fixed z-50 animate-fade-in",
        isInitialized ? 'opacity-100' : 'opacity-0' // Hide until positioned
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
