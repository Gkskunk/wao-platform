pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
class Problem extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function ensure(condition, status, message) {
  if (!condition) throw new Problem(status, message);
}

function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...headers,
    },
  });
}

async function hash(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
    (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function field(body, key, label, min, max) {
  const value = typeof body[key] === 'string' ? body[key].trim() : '';
  ensure(value.length >= min && value.length <= max, 400, `${label} must contain ${min}–${max} characters.`);
  return value;
}

function artifactUrl(body) {
  const value = field(body, 'artifactUrl', 'Artifact URL', 0, 1000);
  if (!value) return '';
  let parsed;
  try { parsed = new URL(value); } catch { throw new Problem(400, 'Use a complete HTTPS artifact URL.'); }
  ensure(parsed.protocol === 'https:' && !parsed.username && !parsed.password, 400, 'Use an HTTPS artifact URL without credentials.');
  return parsed.href;
}

async function bodyOf(request, url) {
  ensure(!request.headers.has('Origin') || request.headers.get('Origin') === url.origin, 403, 'Use the team room origin.');
  ensure(request.headers.get('Sec-Fetch-Site') !== 'cross-site', 403, 'Cross-site writes are blocked.');
  ensure(request.headers.get('Content-Type')?.split(';')[0] === 'application/json', 415, 'Use application/json.');
  const reader = request.body?.getReader();
  ensure(reader, 400, 'Send a JSON object.');
  let size = 0;
  let source = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 24_000) {
        await reader.cancel();
        throw new Problem(413, 'Request is too large.');
      }
      source += decoder.decode(part.value, { stream: true });
    }
  } finally { reader.releaseLock(); }
  let body;
  try { body = JSON.parse(source + decoder.decode()); } catch { throw new Problem(400, 'Send valid JSON.'); }
  ensure(body && typeof body === 'object' && !Array.isArray(body), 400, 'Send a JSON object.');
  return body;
}

export { Problem, ensure, json, hash, field, artifactUrl, bodyOf };
