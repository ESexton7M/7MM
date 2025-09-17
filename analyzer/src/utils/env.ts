/**
 * Environment variables handling utilities
 */

// Define the configuration interface
export interface EnvConfig {
  ASANA_TOKEN: string;
  ASANA_API_BASE: string;
}

/**
 * Load and validate environment variables with fallbacks
 */
export const loadEnvConfig = (): EnvConfig => {
  const ASANA_TOKEN = import.meta.env.VITE_ASANA_TOKEN || '';
  const ASANA_API_BASE = 'https://app.asana.com/api/1.0';

  // Warn about missing token in development
  if (!ASANA_TOKEN && import.meta.env.DEV) {
    console.warn('⚠️ Missing VITE_ASANA_TOKEN environment variable. Please add it to your .env file.');
  }

  return {
    ASANA_TOKEN,
    ASANA_API_BASE
  };
};

/**
 * Check if required environment variables are configured
 */
export const checkEnvConfig = (config: EnvConfig): { valid: boolean; error?: string } => {
  if (!config.ASANA_TOKEN) {
    return {
      valid: false,
      error: 'Missing Asana Personal Access Token. Please add VITE_ASANA_TOKEN to your .env file.'
    };
  }

  return { valid: true };
};