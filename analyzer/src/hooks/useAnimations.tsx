/**
 * Custom hook for intersection observer animations
 */
import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
  
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setIsIntersecting(true);
          if (triggerOnce) {
            setHasTriggered(true);
          }
        } else if (!triggerOnce && !hasTriggered) {
          setIsIntersecting(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, rootMargin, triggerOnce, hasTriggered]);

  return { ref, isIntersecting: triggerOnce ? (isIntersecting || hasTriggered) : isIntersecting };
}

/**
 * Animated container component for smooth fade-in animations
 */
interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade';
}

export function AnimatedSection({ 
  children, 
  className = '', 
  delay = 0, 
  duration = 600,
  direction = 'up'
}: AnimatedSectionProps) {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '-50px'
  });

  const getTransformClasses = () => {
    const baseClasses = `transition-all duration-${duration} ease-out`;
    
    if (isIntersecting) {
      return `${baseClasses} opacity-100 translate-x-0 translate-y-0 scale-100`;
    }

    switch (direction) {
      case 'up':
        return `${baseClasses} opacity-0 translate-y-8`;
      case 'down':
        return `${baseClasses} opacity-0 -translate-y-8`;
      case 'left':
        return `${baseClasses} opacity-0 translate-x-8`;
      case 'right':
        return `${baseClasses} opacity-0 -translate-x-8`;
      case 'fade':
        return `${baseClasses} opacity-0 scale-95`;
      default:
        return `${baseClasses} opacity-0 translate-y-8`;
    }
  };

  return (
    <div
      ref={ref}
      className={`${getTransformClasses()} ${className}`}
      style={{ 
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`
      }}
    >
      {children}
    </div>
  );
}

/**
 * Staggered animation for multiple items
 */
interface StaggeredAnimationProps {
  children: React.ReactNode[];
  className?: string;
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade';
}

export function StaggeredAnimation({ 
  children, 
  className = '', 
  staggerDelay = 100,
  direction = 'up'
}: StaggeredAnimationProps) {
  return (
    <>
      {children.map((child, index) => (
        <AnimatedSection
          key={index}
          className={className}
          delay={index * staggerDelay}
          direction={direction}
        >
          {child}
        </AnimatedSection>
      ))}
    </>
  );
}