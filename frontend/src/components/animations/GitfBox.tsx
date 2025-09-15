import React, { useState, useEffect } from 'react';
import { Gift, Sparkles } from 'lucide-react';

interface GiftBoxProps {
  isOpen: boolean;
  onAnimationComplete: () => void;
  category: string;
  subcategory?: string;
}

const GiftBox: React.FC<GiftBoxProps> = ({ 
  isOpen, 
  onAnimationComplete, 
  category,
  subcategory 
}) => {
  const [animationPhase, setAnimationPhase] = useState<'closed' | 'shaking' | 'opening' | 'opened'>('closed');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showSparkles, setShowSparkles] = useState(false);

  useEffect(() => {
    if (isOpen && animationPhase === 'closed') {
      // Start the animation sequence
      setAnimationPhase('shaking');
      
      // Start countdown after a brief shake
      setTimeout(() => {
        setCountdown(3);
      }, 800);
    }
  }, [isOpen, animationPhase]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Start opening animation
      setAnimationPhase('opening');
      setShowSparkles(true);
      
      // Complete animation after opening
      setTimeout(() => {
        setAnimationPhase('opened');
        onAnimationComplete();
      }, 1500);
    }
  }, [countdown, onAnimationComplete]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'donations': return 'text-green-500';
      case 'books_total': return 'text-blue-500';
      case 'books_category': return 'text-purple-500';
      case 'bible_studies': return 'text-orange-500';
      default: return 'text-primary-500';
    }
  };

  const getCategoryGradient = (cat: string) => {
    switch (cat) {
      case 'donations': return 'from-green-400 to-green-600';
      case 'books_total': return 'from-blue-400 to-blue-600';
      case 'books_category': return 'from-purple-400 to-purple-600';
      case 'bible_studies': return 'from-orange-400 to-orange-600';
      default: return 'from-primary-400 to-primary-600';
    }
  };

  if (animationPhase === 'opened') {
    return null; // Hide the gift box when opened
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative">
        {/* Sparkles */}
        {showSparkles && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <Sparkles
                key={i}
                className={`absolute ${getCategoryColor(category)} animate-ping`}
                size={16 + Math.random() * 16}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Gift Box */}
        <div className={`
          relative transition-all duration-500 transform
          ${animationPhase === 'shaking' ? 'animate-bounce' : ''}
          ${animationPhase === 'opening' ? 'scale-110 rotate-12' : 'scale-100'}
        `}>
          {/* Box Base */}
          <div className={`
            w-32 h-32 bg-gradient-to-br ${getCategoryGradient(category)} 
            rounded-lg shadow-2xl relative overflow-hidden
            ${animationPhase === 'opening' ? 'animate-pulse' : ''}
          `}>
            {/* Box Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="w-full h-full bg-white bg-opacity-30 transform rotate-45 scale-150"></div>
            </div>
            
            {/* Ribbon Vertical */}
            <div className="absolute left-1/2 top-0 w-4 h-full bg-yellow-300 transform -translate-x-1/2 shadow-md"></div>
            
            {/* Ribbon Horizontal */}
            <div className="absolute top-1/2 left-0 w-full h-4 bg-yellow-300 transform -translate-y-1/2 shadow-md"></div>
            
            {/* Gift Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Gift 
                size={48} 
                className={`text-white drop-shadow-lg ${
                  animationPhase === 'opening' ? 'animate-spin' : ''
                }`} 
              />
            </div>
            
            {/* Bow */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <div className="w-8 h-6 bg-red-500 rounded-full relative">
                <div className="absolute -left-2 top-1 w-6 h-4 bg-red-400 rounded-full transform -rotate-45"></div>
                <div className="absolute -right-2 top-1 w-6 h-4 bg-red-400 rounded-full transform rotate-45"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Countdown */}
        {countdown !== null && countdown > 0 && (
          <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2">
            <div className={`
              w-16 h-16 rounded-full bg-gradient-to-br ${getCategoryGradient(category)}
              flex items-center justify-center shadow-2xl animate-pulse
            `}>
              <span className="text-3xl font-bold text-white drop-shadow-lg">
                {countdown}
              </span>
            </div>
          </div>
        )}

        {/* Category Label */}
        <div className="absolute -bottom-32 left-1/2 transform -translate-x-1/2 text-center">
          <div className="bg-white rounded-lg px-4 py-2 shadow-lg">
            <p className="text-sm font-semibold text-gray-800">
              Preparando logros...
            </p>
            <p className={`text-xs ${getCategoryColor(category)} font-medium`}>
              {category === 'donations' && 'Mayores Donaciones'}
              {category === 'books_total' && 'Más Libros Vendidos'}
              {category === 'books_category' && 'Libros por Categoría'}
              {category === 'bible_studies' && 'Estudios Bíblicos'}
              {subcategory && ` - ${subcategory}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftBox;
