import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

/**
 * Component that displays the status of the Asana data cache
 */
const CacheStatusIndicator: React.FC = () => {
  const [cacheStatus, setCacheStatus] = useState<{
    hasData: boolean,
    lastUpdated: string | null,
    projectCount: number,
    expiresIn: string | null
  }>({
    hasData: false,
    lastUpdated: null,
    projectCount: 0,
    expiresIn: null
  });
  
  // Fetch cache status every 30 seconds
  useEffect(() => {
    const fetchCacheStatus = async () => {
      try {
        const { getCacheStatus } = await import('../utils/asanaCache');
        setCacheStatus(getCacheStatus());
      } catch (err) {
        console.error('Error fetching cache status:', err);
      }
    };
    
    // Immediately fetch on mount
    fetchCacheStatus();
    
    // Then fetch every 30 seconds
    const intervalId = setInterval(fetchCacheStatus, 30000);
    
    // Clear interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  if (!cacheStatus.hasData) {
    return null;
  }

  return (
    <div className="flex items-center text-xs sm:text-sm text-gray-400">
      <Clock className="h-4 w-4 mr-1" />
      <span>
        Cached {cacheStatus.projectCount} projects 
        <span className="hidden sm:inline"> • Last updated: {cacheStatus.lastUpdated}</span>
        {cacheStatus.expiresIn && <span className="hidden sm:inline"> • Expires in: {cacheStatus.expiresIn}</span>}
      </span>
    </div>
  );
};

export default CacheStatusIndicator;