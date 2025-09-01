#!/usr/bin/env bash
set -euo pipefail

# Create directories
mkdir -p routes

# Create server.js
cat > server.js <<'EOF'
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
 * Utility: Parse query string into an object (fallback if event.queryStringParameters is absent).
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
    // Support repeated keys as arrays
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
    // Return raw string for non-JSON content types
    return { data: raw, error: null };
  } catch (e) {
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
 * Modules export an object with keys like "GET:/hello" or "GET:/labs/{id}".
 */
const loadRoutes = () => {
  const map = {};
  const dir = path.join(__dirname, 'routes');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const mod = require(path.join(dir, file));
    Object.assign(map, mod);
  }
  // Compile to an array for matching (supports param routes)
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

  // Stage-aware path normalization: remove "/<stage>" only if stage is not $default
  const cleanPath =
    stage && stage !== '$default'
      ? rawPath.replace(new RegExp(`^/${stage}(?=/|$)`), '')
      : rawPath;

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
    // Try exact and param-based matching
    for (const r of compiledRoutes) {
      if (r.method !== method) continue;
      const match = r.regex.exec(cleanPath);
      if (!match) continue;

      // Extract path params
      const pathParams = {};
      r.keys.forEach((k, i) => (pathParams[k] = match[i + 1]));

      // Invoke handler
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

      // Ensure JSON shape
      if (!result || typeof result !== 'object' || !('statusCode' in result)) {
        return jsonResponse(500, { success: false, error: 'Handler returned invalid response' });
      }
      return result;
    }

    // No route matched
    return jsonResponse(404, { success: false, error: 'Not Found', path: cleanPath });
  } catch (err) {
    console.error('Unhandled error:', err);
    return jsonResponse(500, { success: false, error: 'Internal Server Error' });
  }
};
EOF

# Create routes/hello.js
cat > routes/hello.js <<'EOF'
module.exports = {
  'GET:/hello': async ({ jsonResponse }) => {
    return jsonResponse(200, {
      success: true,
      message: 'Hello from the CybAcad backend!',
      timestamp: new Date().toISOString(),
    });
  },
};
EOF

# Create routes/labs.js
cat > routes/labs.js <<'EOF'
module.exports = {
  // Create a lab (JSON body)
  'POST:/labs': async ({ body, jsonResponse }) => {
    // Placeholder: validate shape minimally
    if (!body || typeof body !== 'object' || !body.name) {
      return jsonResponse(400, { success: false, error: 'Missing required field: name' });
    }
    // TODO: insert into database (e.g., Firestore) and return created resource
    return jsonResponse(201, {
      success: true,
      message: 'Lab created successfully (placeholder)',
      lab: {
        id: 'lab_demo_id',
        name: body.name,
        createdAt: new Date().toISOString(),
      },
    });
  },

  // List labs (supports query params like ?status=active&page=1)
  'GET:/labs': async ({ query, jsonResponse }) => {
    // TODO: fetch from database with filters from query
    return jsonResponse(200, {
      success: true,
      labs: [
        { id: 'lab_1', name: 'Intro Lab', status: 'active' },
        { id: 'lab_2', name: 'Advanced Lab', status: 'draft' },
      ],
      query,
    });
  },

  // Get lab by id using path param: /labs/{id}
  'GET:/labs/{id}': async ({ params, jsonResponse }) => {
    const { id } = params;
    // TODO: fetch from database
    return jsonResponse(200, {
      success: true,
      lab: { id, name: `Lab ${id}`, status: 'active' },
    });
  },
};
EOF

echo "Project files created."
echo "Next:"
echo "  1) Deploy with SAM as you already do (Handler: server.api)."
echo "  2) Test endpoints like:"
echo "     GET  https://<api-id>.execute-api.<region>.amazonaws.com/hello"
echo "     GET  https://<api-id>.execute-api.<region>.amazonaws.com/labs"
echo "     GET  https://<api-id>.execute-api.<region>.amazonaws.com/labs/123"
echo "     POST https://<api-id>.execute-api.<region>.amazonaws.com/labs  -d '{\"name\":\"NetSec 101\"}' -H 'Content-Type: application/json'"
