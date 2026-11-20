import type { Plugin } from 'vite';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

function parseKeyOrIv(raw: string, format: string, expectedBytes?: number): Buffer {
  let buf: Buffer;
  if (format === 'hex') {
    buf = Buffer.from(raw.replace(/\s+/g, ''), 'hex');
  } else if (format === 'base64') {
    buf = Buffer.from(raw.trim(), 'base64');
  } else {
    buf = Buffer.from(raw, 'utf8');
  }
  if (expectedBytes && buf.length !== expectedBytes) {
    if (format === 'utf8') {
      return crypto.createHash('sha256').update(buf).digest().subarray(0, expectedBytes);
    }
    throw new Error(`Expected ${expectedBytes} bytes for key/IV, but got ${buf.length} bytes.`);
  }
  return buf;
}

export function executeHash(body: Record<string, any>) {
  const { input = '', algorithm = 'sha256', outputEncoding = 'hex', hmacKey = '', keyEncoding = 'utf8' } = body;
  const dataBuf = Buffer.from(String(input), 'utf8');
  let digestBuf: Buffer;
  if (hmacKey && String(hmacKey).length > 0) {
    const keyBuf = parseKeyOrIv(String(hmacKey), keyEncoding);
    digestBuf = crypto.createHmac(algorithm, keyBuf).update(dataBuf).digest();
  } else {
    digestBuf = crypto.createHash(algorithm).update(dataBuf).digest();
  }
  return outputEncoding === 'base64' ? digestBuf.toString('base64') : digestBuf.toString('hex');
}

export function executeKdf(body: Record<string, any>) {
  const {
    password = '',
    salt = 'cyberchef-dave-salt',
    mode = 'pbkdf2',
    iterations = 100000,
    keyLength = 32,
    digest = 'sha256',
    outputEncoding = 'hex',
  } = body;
  const passBuf = Buffer.from(String(password), 'utf8');
  const saltBuf = Buffer.from(String(salt), 'utf8');
  const len = Math.min(Math.max(Number(keyLength) || 32, 8), 512);
  let derived: Buffer;
  if (mode === 'scrypt') {
    derived = crypto.scryptSync(passBuf, saltBuf, len, { N: 16384, r: 8, p: 1 });
  } else {
    const iter = Math.min(Math.max(Number(iterations) || 10000, 1), 2000000);
    derived = crypto.pbkdf2Sync(passBuf, saltBuf, iter, len, digest);
  }
  return outputEncoding === 'base64' ? derived.toString('base64') : derived.toString('hex');
}

export function executeAes(body: Record<string, any>) {
  const {
    input = '',
    action = 'encrypt',
    mode = 'aes-256-gcm',
    key = '',
    keyEncoding = 'utf8',
    iv = '',
    ivEncoding = 'hex',
    outputEncoding = 'base64',
  } = body;
  if (!key) {
    throw new Error('Encryption/Decryption key is required.');
  }
  const keyBuf = parseKeyOrIv(String(key), keyEncoding, 32);
  if (mode === 'aes-256-gcm') {
    if (action === 'encrypt') {
      const ivBuf = iv ? parseKeyOrIv(String(iv), ivEncoding, 12) : crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, ivBuf);
      const encrypted = Buffer.concat([cipher.update(String(input), 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const combined = Buffer.concat([ivBuf, authTag, encrypted]);
      return outputEncoding === 'hex' ? combined.toString('hex') : combined.toString('base64');
    }
    const rawStr = String(input).trim();
    const combined =
      outputEncoding === 'hex'
        ? Buffer.from(rawStr.replace(/\s+/g, ''), 'hex')
        : Buffer.from(rawStr, 'base64');
    if (combined.length < 28) {
      throw new Error('Ciphertext too short to contain 12-byte IV + 16-byte GCM Auth Tag.');
    }
    const ivBuf = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const ciphertext = combined.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, ivBuf);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }

  if (action === 'encrypt') {
    const ivBuf = iv ? parseKeyOrIv(String(iv), ivEncoding, 16) : crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, ivBuf);
    const encrypted = Buffer.concat([cipher.update(String(input), 'utf8'), cipher.final()]);
    const combined = Buffer.concat([ivBuf, encrypted]);
    return outputEncoding === 'hex' ? combined.toString('hex') : combined.toString('base64');
  }
  const rawStr = String(input).trim();
  const combined =
    outputEncoding === 'hex'
      ? Buffer.from(rawStr.replace(/\s+/g, ''), 'hex')
      : Buffer.from(rawStr, 'base64');
  if (combined.length < 17) {
    throw new Error('Ciphertext too short to contain 16-byte CBC IV + payload.');
  }
  const ivBuf = combined.subarray(0, 16);
  const ciphertext = combined.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, ivBuf);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

export function executeZlib(body: Record<string, any>) {
  const { input = '', action = 'compress', algorithm = 'gzip', encoding = 'base64' } = body;
  if (action === 'compress') {
    const src = Buffer.from(String(input), 'utf8');
    let out: Buffer;
    if (algorithm === 'brotli') {
      out = zlib.brotliCompressSync(src);
    } else if (algorithm === 'deflate') {
      out = zlib.deflateSync(src);
    } else {
      out = zlib.gzipSync(src);
    }
    return encoding === 'hex' ? out.toString('hex') : out.toString('base64');
  }
  const clean = String(input).trim();
  const src =
    encoding === 'hex'
      ? Buffer.from(clean.replace(/\s+/g, ''), 'hex')
      : Buffer.from(clean, 'base64');
  let out: Buffer;
  if (algorithm === 'brotli') {
    out = zlib.brotliDecompressSync(src);
  } else if (algorithm === 'deflate') {
    out = zlib.inflateSync(src);
  } else {
    out = zlib.gunzipSync(src);
  }
  return out.toString('utf8');
}

export function cyberChefNodeApiPlugin(): Plugin {
  return {
    name: 'cyberchef-dave-node-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
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
            if (req.url === '/api/crypto/hash') {
              res.end(JSON.stringify({ output: executeHash(body) }));
            } else if (req.url === '/api/crypto/kdf') {
              res.end(JSON.stringify({ output: executeKdf(body) }));
            } else if (req.url === '/api/crypto/aes') {
              res.end(JSON.stringify({ output: executeAes(body) }));
            } else if (req.url === '/api/crypto/zlib') {
              res.end(JSON.stringify({ output: executeZlib(body) }));
            } else {
              next();
            }
          } catch (err: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: err?.message || 'Node API execution failed' }));
          }
        });
      });
    },
  };
}
