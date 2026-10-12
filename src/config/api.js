/**
 * Single source for the backend URL.
 * Set VITE_API_BASE_URL in .env / your hosting provider (e.g. Vercel):
 *   VITE_API_BASE_URL=https://api.yourdomain.com
 * The old Render URL is kept as a fallback so existing deployments keep working.
 */
const FALLBACK_API_URL = 'https://api-0ggv.onrender.com';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || FALLBACK_API_URL).replace(/\/+$/, '');
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_BASE_URL).replace(/\/+$/, '');
