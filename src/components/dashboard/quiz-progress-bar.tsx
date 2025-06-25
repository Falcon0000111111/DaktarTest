
"use client";

import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from 'react';

interface QuizProgressBarProps {
  totalQuestions: number;
  answeredQuestions: number;
}

export function QuizProgressBar({ totalQuestions, answeredQuestions }: QuizProgressBarProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (progressBarRef.current) {
        // Position on the left side to avoid timer
        const initialX = 32; 
        const initialY = (window.innerHeight - progressBarRef.current.offsetHeight) / 2;
        setPosition({ x: initialX, y: initialY });
        setIsInitialized(true);
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    setIsDragging(true);
    const rect = progressBarRef.current.getBoundingClientRect();
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

  return (
    <div
      ref={progressBarRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "fixed z-50 animate-fade-in",
        isInitialized ? 'opacity-100' : 'opacity-0',
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
      }}
    >
      <div className="flex flex-col items-center gap-2.5 bg-card/60 backdrop-blur-sm p-2 rounded-full border shadow-lg">
        {Array.from({ length: totalQuestions }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-2.5 w-2.5 rounded-full bg-muted/70 transition-all duration-300",
              index < answeredQuestions && "bg-primary scale-125 shadow-md shadow-primary/50"
            )}
            title={`Question ${index + 1} ${index < answeredQuestions ? '(Answered)' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
