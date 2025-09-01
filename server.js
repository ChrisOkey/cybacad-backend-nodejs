 'use strict';
const fs = require('fs');
const path = require('path');

/**
 * Utility: Build a consistent JSON response with CORS.
 */
const jsonResponse = (statusCode, payload, extraHeaders = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    ...extraHeaders,
  },
  body: JSON.stringify(payload, null, 2),
});

/**
 * Utility: Parse query string into an object.
 */
const parseQuery = (event) => {
  if (event.queryStringParameters && typeof event.queryStringParameters === 'object') {
    return event.queryStringParameters;
  }
  const raw = event.rawQueryString || '';
  if (!raw) return {};
  return raw.split('&').reduce((acc, kv) => {
    if (!kv) return acc;
    const [k, v = ''] = kv.split('=');
    const key = decodeURIComponent(k || '').trim();
    const val = decodeURIComponent(v || '');
    if (!key) return acc;
    if (acc[key] !== undefined) {
      acc[key] = Array.isArray(acc[key]) ? [...acc[key], val] : [acc[key], val];
    } else {
      acc[key] = val;
    }
    return acc;
  }, {});
};

/**
 * Utility: Safely parse JSON body; base64 and content-type aware.
 */
const parseBody = (event) => {
  if (!event || event.body == null) return { data: null, error: null };
  const headers = event.headers || {};
  const contentType = Object.entries(headers).reduce((acc, [k, v]) => {
    return k.toLowerCase() === 'content-type' ? String(v || '').toLowerCase() : acc;
  }, '');
  let raw = event.body;
  try {
    if (event.isBase64Encoded) {
      raw = Buffer.from(event.body, 'base64').toString('utf8');
    }
    if (contentType && contentType.includes('application/json')) {
      return { data: JSON.parse(raw), error: null };
    }
    return { data: raw, error: null };
  } catch {
    return { data: null, error: 'Invalid JSON body' };
  }
};

/**
 * Convert a route path pattern like "/labs/{id}" into a regex and capture keys.
 */
const compilePath = (pattern) => {
  const keys = [];
  const escaped = pattern
    .replace(/[-/\\^$*+?.()|[\]{}]/g, (m) => (m === '{' || m === '}' ? m : '\\' + m))
    .replace(/\{([^}]+)\}/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
  const regex = new RegExp(`^${escaped}$`);
  return { regex, keys };
};

/**
 * Load all route modules dynamically from routes/*.js and compile patterns.
 */
const loadRoutes = () => {
  const map = {};
  const dir = path.join(__dirname, 'routes');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const mod = require(path.join(dir, file));
    Object.assign(map, mod);
  }
  const compiled = [];
  for (const key of Object.keys(map)) {
    const [method, routePath] = key.split(':');
    const { regex, keys } = compilePath(routePath);
    compiled.push({ method, routePath, regex, keys, handler: map[key] });
  }
  return compiled;
};

const compiledRoutes = loadRoutes();

/**
 * Main Lambda handler (server.api in SAM).
 */
module.exports.api = async (event) => {
  const rawPath = event.rawPath || '';
  const method = event.requestContext?.http?.method || 'GET';
  const stage = event.requestContext?.stage || '$default';

  // Always strip the stage prefix if it matches the current stage name
  let cleanPath = rawPath;
  if (stage && stage !== '$default') {
    cleanPath = rawPath.replace(new RegExp(`^/${stage}(?=/|$)`), '');
  }

  // Preflight CORS
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      },
      body: '',
    };
  }

  const query = parseQuery(event);
  const { data: body, error: bodyError } = parseBody(event);
  if (bodyError) {
    return jsonResponse(400, { success: false, error: bodyError });
  }

  console.log(
    JSON.stringify(
      {
        stage,
        method,
        rawPath,
        cleanPath,
        query,
        hasBody: body != null,
      },
      null,
      2
    )
  );

  try {
    for (const r of compiledRoutes) {
      if (r.method !== method) continue;
      const match = r.regex.exec(cleanPath);
      if (!match) continue;

      const pathParams = {};
      r.keys.forEach((k, i) => (pathParams[k] = match[i + 1]));

      const result = await r.handler({
        event,
        method,
        rawPath,
        path: cleanPath,
        params: pathParams,
        query,
        body,
        jsonResponse,
      });

      if (!result || typeof result !== 'object' || !('statusCode' in result)) {
        return jsonResponse(500, { success: false, error: 'Handler returned invalid response' });
      }
      return result;
    }

    return jsonResponse(404, { success: false, error: 'Not Found', path: cleanPath });
  } catch (err) {
    console.error('Unhandled error:', err);
    return jsonResponse(500, { success: false, error: 'Internal Server Error' });
  }
};

