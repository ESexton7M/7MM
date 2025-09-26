import React from 'react';
import { standardPhaseCategories, getSectionCategoryColor } from '../config/sectionPhases';

/**
 * Component that displays a legend for section phase colors
 */
const SectionPhaseLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap gap-3 mt-4">
      {standardPhaseCategories.map(phase => (
        <div key={phase} className="flex items-center">
          <div 
            className="w-4 h-4 rounded-sm mr-1.5"
            style={{ backgroundColor: getSectionCategoryColor(phase) }}
          />
          <span className="text-sm text-gray-200">{phase}</span>
        </div>
      ))}
      <div className="flex items-center">
        <div 
          className="w-4 h-4 rounded-sm mr-1.5"
          style={{ backgroundColor: getSectionCategoryColor('Other') }}
        />
        <span className="text-sm text-gray-200">Other</span>
      </div>
    </div>
  );
};

export default SectionPhaseLegend;
