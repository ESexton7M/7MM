import type { FC } from 'react';
import type { LoadingSpinnerProps } from '../types';

/**
 * Loading spinner component with customizable size and color
 */
const LoadingSpinner: FC<LoadingSpinnerProps> = ({ 
  size = '12',
  color = 'blue-500'
}) => (
  <div className="flex justify-center items-center p-8">
    <div 
      className={`w-${size} h-${size} border-4 border-${color} border-t-transparent rounded-full animate-spin`}
      aria-label="Loading"
    ></div>
  </div>
);

export default LoadingSpinner;