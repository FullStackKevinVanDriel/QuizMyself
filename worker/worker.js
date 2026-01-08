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

    if (request.method === 'GET') {
      const data = await env.PROGRESS.get('state');
      return new Response(data || '{}', { headers });
    }

    if (request.method === 'PUT') {
      await env.PROGRESS.put('state', await request.text());
      return new Response('{"ok":true}', { headers });
    }

    return new Response('{"error":"not found"}', { status: 404, headers });
  }
};
