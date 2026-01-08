export default {
  async fetch(request, env) {
    const headers = {
      'Access-Control-Allow-Origin': 'https://fullstackkevinvandriel.github.io',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // Extract keyword from URL path: /keyword
    const url = new URL(request.url);
    const keyword = url.pathname.slice(1).toLowerCase().trim();

    if (!keyword || keyword.length < 1) {
      return new Response('{"error":"keyword required"}', { status: 400, headers });
    }

    // Sanitize keyword - alphanumeric and hyphens only
    const sanitized = keyword.replace(/[^a-z0-9-]/g, '');
    if (sanitized !== keyword) {
      return new Response('{"error":"invalid keyword - use letters, numbers, hyphens only"}', { status: 400, headers });
    }

    const storageKey = `progress:${sanitized}`;

    if (request.method === 'GET') {
      const data = await env.PROGRESS.get(storageKey);
      return new Response(data || '{}', { headers });
    }

    if (request.method === 'PUT') {
      await env.PROGRESS.put(storageKey, await request.text());
      return new Response('{"ok":true}', { headers });
    }

    return new Response('{"error":"not found"}', { status: 404, headers });
  }
};
