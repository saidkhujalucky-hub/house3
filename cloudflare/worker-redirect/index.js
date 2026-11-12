// Forward the separate Worker to the active House3 Pages site.
export default {
  fetch(request) {
    const url = new URL(request.url);
    return Response.redirect('https://house3-9ws.pages.dev' + url.pathname + url.search, 307);
  }
};
