/**
 * Utility functions for statistical calculations and time conversions
 */

/**
 * Convert days to weeks, rounded
 * @param days Number of days
 * @returns Number of weeks (rounded)
 */
export function daysToWeeks(days: number): number {
  return Math.round(days / 7);
}

/**
 * Format duration in weeks with proper pluralization
 * @param days Number of days
 * @returns Formatted string (e.g., "32 weeks", "1 week")
 */
export function formatDurationInWeeks(days: number): string {
  const weeks = daysToWeeks(days);
  return weeks === 1 ? '1 week' : `${weeks} weeks`;
}

/**
 * Calculate mean (average) of an array of numbers
 * @param values Array of numbers
 * @returns Mean value
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Calculate median of an array of numbers
 * @param values Array of numbers
 * @returns Median value
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  } else {
    return sorted[middle] ?? 0;
  }
}

/**
 * Calculate range (max - min) of an array of numbers
 * @param values Array of numbers
 * @returns Range value
 */
export function calculateRange(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[sorted.length - 1] ?? 0) - (sorted[0] ?? 0);
}

/**
 * Calculate skewness of an array of numbers
 * @param values Array of numbers
 * @returns Skewness value (negative = left-skewed, positive = right-skewed)
 */
export function calculateSkewness(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = calculateMean(values);
  const stdDev = calculateStandardDeviation(values);
  
  if (stdDev === 0) return 0;
  
  const n = values.length;
  const skewSum = values.reduce((sum, value) => {
    return sum + Math.pow((value - mean) / stdDev, 3);
  }, 0);
  
  return (n / ((n - 1) * (n - 2))) * skewSum;
}

/**
 * Calculate standard deviation of an array of numbers
 * @param values Array of numbers
 * @returns Standard deviation
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = calculateMean(values);
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const variance = calculateMean(squaredDifferences);
  
  return Math.sqrt(variance);
}

/**
 * Calculate comprehensive statistics for an array of values
 * @param values Array of numbers
 * @returns Object containing all statistical measures
 */
export function calculateStatistics(values: number[]) {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      range: 0,
      skewness: 0,
      standardDeviation: 0,
      min: 0,
      max: 0,
      count: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  
  return {
    mean: calculateMean(values),
    median: calculateMedian(values),
    range: calculateRange(values),
    skewness: calculateSkewness(values),
    standardDeviation: calculateStandardDeviation(values),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: values.length
  };
}

/**
 * Format a number to a reasonable number of decimal places
 * @param value Number to format
 * @param decimals Maximum number of decimal places (default: 1)
 * @returns Formatted number
 */
export function formatNumber(value: number, decimals: number = 1): string {
  if (decimals === 2) {
    return Number(value.toFixed(2)).toString();
  }
  return Number(value.toFixed(decimals)).toString();
}