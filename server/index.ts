import http from 'node:http';
import crypto from 'node:crypto';
import { executeAes, executeHash, executeKdf, executeZlib } from './apiMiddleware';

const PORT = Number(process.env.PORT || 3001);

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.url === '/api/health' && req.method === 'GET') {
    res.end(
      JSON.stringify({
        status: 'ok',
        engine: 'CyberChef-Dave Node.js Native Engine',
        nodeVersion: process.version,
        hashesSupported: crypto.getHashes().length,
        ciphersSupported: crypto.getCiphers().length,
      })
    );
    return;
  }

  let rawBody = '';
  req.on('data', (chunk) => {
    rawBody += chunk;
  });

  req.on('end', () => {
    try {
      const body = rawBody ? JSON.parse(rawBody) : {};
      if (req.url === '/api/crypto/hash' && req.method === 'POST') {
        res.end(JSON.stringify({ output: executeHash(body) }));
      } else if (req.url === '/api/crypto/kdf' && req.method === 'POST') {
        res.end(JSON.stringify({ output: executeKdf(body) }));
      } else if (req.url === '/api/crypto/aes' && req.method === 'POST') {
        res.end(JSON.stringify({ output: executeAes(body) }));
      } else if (req.url === '/api/crypto/zlib' && req.method === 'POST') {
        res.end(JSON.stringify({ output: executeZlib(body) }));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
      }
    } catch (err: any) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: err?.message || 'Node operation failed' }));
    }
  });
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[CyberChef-Dave Backend] Port ${PORT} already active, reusing running instance.`);
  } else {
    console.error('[CyberChef-Dave Backend] Server error:', err);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[CyberChef-Dave Backend] Listening on http://127.0.0.1:${PORT}`);
});
