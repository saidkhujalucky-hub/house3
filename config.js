/* Frontend API endpoint configuration:
   Cloudflare Pages/custom domains: same-origin /api proxy (BACKEND_ORIGIN).
   Local development/GitHub Pages: unchanged localhost API until explicitly configured.
*/
const hostname = window.location.hostname.toLowerCase();
const cloudflareHosted = !['localhost','127.0.0.1'].includes(hostname) && !hostname.endsWith('.github.io');
window.MARKETPLACE_CONFIG = {
  apiBaseUrl: cloudflareHosted ? '/api' : 'http://localhost:3000',
};
