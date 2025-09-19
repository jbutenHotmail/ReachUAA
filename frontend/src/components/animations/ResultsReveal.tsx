import React, { useState, useEffect } from 'react';
import { Trophy, Star, Sparkles } from 'lucide-react';

interface ResultsRevealProps {
  isVisible: boolean;
  children: React.ReactNode;
  category: string;
}

const ResultsReveal: React.FC<ResultsRevealProps> = ({ 
  isVisible, 
  children, 
  category 
}) => {
  const [animationPhase, setAnimationPhase] = useState<'hidden' | 'entering' | 'visible'>('hidden');

  useEffect(() => {
    if (isVisible && animationPhase === 'hidden') {
      setAnimationPhase('entering');
      setTimeout(() => {
        setAnimationPhase('visible');
      }, 500);
    } else if (!isVisible) {
      setAnimationPhase('hidden');
    }
  }, [isVisible, animationPhase]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'donations': return 'text-green-500';
      case 'books_total': return 'text-blue-500';
      case 'books_category': return 'text-purple-500';
      case 'bible_studies': return 'text-orange-500';
      default: return 'text-primary-500';
    }
  };

  if (animationPhase === 'hidden') {
    return null;
  }

  return (
    <div className={`
      transition-all duration-1000 transform
      ${animationPhase === 'entering' 
        ? 'opacity-0 scale-95 translate-y-8' 
        : 'opacity-100 scale-100 translate-y-0'
      }
    `}>
      {/* Celebration Header */}
      {animationPhase === 'visible' && (
        <div className="relative mb-6 text-center">
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <Sparkles
                key={i}
                className={`absolute ${getCategoryColor(category)} animate-ping`}
                size={12 + Math.random() * 8}
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random()}s`
                }}
              />
            ))}
          </div>
          
          <div className="relative">
            <Trophy className={`mx-auto mb-2 ${getCategoryColor(category)} animate-bounce`} size={32} />
            <h3 className="text-lg font-bold text-gray-800 animate-pulse">
              ¡Logros Revelados!
            </h3>
          </div>
        </div>
      )}

      {/* Results Content */}
      <div className={`
        transition-all duration-700 delay-300
        ${animationPhase === 'entering' 
          ? 'opacity-0 transform translate-y-4' 
          : 'opacity-100 transform translate-y-0'
        }
      `}>
        {children}
      </div>
    </div>
  );
};

export default ResultsReveal;
