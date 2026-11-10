// Cloudflare Pages Function: same-origin API proxy.
// Set BACKEND_ORIGIN in Cloudflare Pages environment variables to a public HTTPS
// URL serving the existing NestJS backend, e.g. https://your-api.example.com.
export async function onRequest({ request, env, params }) {
  const configured = String(env.BACKEND_ORIGIN || '').trim();
  let base;
  try {
    base = new URL(configured);
    if (base.protocol !== 'https:' || base.username || base.password ||
        base.search || base.hash || base.pathname !== '/') throw new Error('invalid origin');
  } catch {
    return Response.json(
      { message: 'Backend is not connected. Configure BACKEND_ORIGIN in Cloudflare Pages with the HTTPS address of the NestJS API.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  const parts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  const url = new URL(request.url);
  const target = new URL(base.origin);
  target.pathname = '/' + parts.map(encodeURIComponent).join('/');
  target.search = url.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cf-connecting-ip');
  headers.delete('x-forwarded-for');
  headers.delete('x-forwarded-proto');
  headers.set('x-forwarded-host', url.host);
  // Request carries the original method and body (including multipart uploads).
  try {
    const upstream = await fetch(new Request(target, { method: request.method, headers, body: ['GET','HEAD'].includes(request.method) ? undefined : request.body, redirect: 'manual' }));
    const result = new Response(upstream.body, upstream);
    result.headers.set('Cache-Control', 'no-store');
    return result;
  } catch {
    return Response.json({ message: 'Backend is unavailable. Check the API server and BACKEND_ORIGIN.' }, { status: 502, headers: { 'Cache-Control':'no-store' } });
  }
}
