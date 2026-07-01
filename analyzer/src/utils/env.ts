/**
 * Client-side environment configuration shim.
 *
 * The Asana Personal Access Token used to live in the browser bundle via
 * `VITE_ASANA_TOKEN`. That token is now held only on the server (see
 * /.env.example). For backwards compatibility, components that still call
 * `loadEnvConfig()` receive an empty token, which makes their direct-Asana
 * fallback paths short-circuit harmlessly - the data they need is already
 * pre-enriched in the server cache.
 */

export interface EnvConfig {
  ASANA_TOKEN: string;
  ASANA_API_BASE: string;
}

export const loadEnvConfig = (): EnvConfig => ({
  ASANA_TOKEN: '',
  ASANA_API_BASE: 'https://app.asana.com/api/1.0',
});

export const checkEnvConfig = (): { valid: boolean; error?: string } => ({
  valid: true,
});
