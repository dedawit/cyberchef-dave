import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ limit: '25mb' }));

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
    // Derive or pad/slice deterministically if user passes arbitrary passphrase in utf8
    if (format === 'utf8') {
      return crypto.createHash('sha256').update(buf).digest().subarray(0, expectedBytes);
    }
    throw new Error(`Expected ${expectedBytes} bytes for key/IV, but got ${buf.length} bytes.`);
  }
  return buf;
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    engine: 'CyberChef-Dave Node.js Native Engine',
    nodeVersion: process.version,
    hashesSupported: crypto.getHashes().length,
    ciphersSupported: crypto.getCiphers().length,
  });
});

// Native Node.js Hash & HMAC endpoint
app.post('/api/crypto/hash', (req, res) => {
  try {
    const { input = '', algorithm = 'sha256', outputEncoding = 'hex', hmacKey = '', keyEncoding = 'utf8' } = req.body;
    const dataBuf = Buffer.from(String(input), 'utf8');

    let digestBuf: Buffer;
    if (hmacKey && String(hmacKey).length > 0) {
      const keyBuf = parseKeyOrIv(String(hmacKey), keyEncoding);
      digestBuf = crypto.createHmac(algorithm, keyBuf).update(dataBuf).digest();
    } else {
      digestBuf = crypto.createHash(algorithm).update(dataBuf).digest();
    }

    const output = outputEncoding === 'base64' ? digestBuf.toString('base64') : digestBuf.toString('hex');
    res.json({ output });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Hash execution failed' });
  }
});

// Native Node.js Key Derivation (PBKDF2 / Scrypt)
app.post('/api/crypto/kdf', (req, res) => {
  try {
    const {
      password = '',
      salt = 'cyberchef-dave-salt',
      mode = 'pbkdf2',
      iterations = 100000,
      keyLength = 32,
      digest = 'sha256',
      outputEncoding = 'hex',
    } = req.body;

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

    res.json({
      output: outputEncoding === 'base64' ? derived.toString('base64') : derived.toString('hex'),
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Key derivation failed' });
  }
});

// Native Node.js AES Encrypt / Decrypt (AES-256-GCM / AES-256-CBC)
app.post('/api/crypto/aes', (req, res) => {
  try {
    const {
      input = '',
      action = 'encrypt',
      mode = 'aes-256-gcm',
      key = '',
      keyEncoding = 'utf8',
      iv = '',
      ivEncoding = 'hex',
      outputEncoding = 'base64',
    } = req.body;

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
        res.json({
          output: outputEncoding === 'hex' ? combined.toString('hex') : combined.toString('base64'),
        });
      } else {
        const rawStr = String(input).trim();
        const combined = outputEncoding === 'hex' ? Buffer.from(rawStr.replace(/\s+/g, ''), 'hex') : Buffer.from(rawStr, 'base64');
        if (combined.length < 28) {
          throw new Error('Ciphertext too short to contain 12-byte IV + 16-byte GCM Auth Tag.');
        }
        const ivBuf = combined.subarray(0, 12);
        const authTag = combined.subarray(12, 28);
        const ciphertext = combined.subarray(28);
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, ivBuf);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        res.json({ output: decrypted.toString('utf8') });
      }
    } else {
      // aes-256-cbc
      if (action === 'encrypt') {
        const ivBuf = iv ? parseKeyOrIv(String(iv), ivEncoding, 16) : crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, ivBuf);
        const encrypted = Buffer.concat([cipher.update(String(input), 'utf8'), cipher.final()]);
        const combined = Buffer.concat([ivBuf, encrypted]);
        res.json({
          output: outputEncoding === 'hex' ? combined.toString('hex') : combined.toString('base64'),
        });
      } else {
        const rawStr = String(input).trim();
        const combined = outputEncoding === 'hex' ? Buffer.from(rawStr.replace(/\s+/g, ''), 'hex') : Buffer.from(rawStr, 'base64');
        if (combined.length < 17) {
          throw new Error('Ciphertext too short to contain 16-byte CBC IV + payload.');
        }
        const ivBuf = combined.subarray(0, 16);
        const ciphertext = combined.subarray(16);
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, ivBuf);
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        res.json({ output: decrypted.toString('utf8') });
      }
    }
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'AES operation failed' });
  }
});

// Native Node.js Zlib Compression / Decompression (Gzip / Deflate / Brotli)
app.post('/api/crypto/zlib', (req, res) => {
  try {
    const { input = '', action = 'compress', algorithm = 'gzip', encoding = 'base64' } = req.body;
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
      res.json({ output: encoding === 'hex' ? out.toString('hex') : out.toString('base64') });
    } else {
      const clean = String(input).trim();
      const src = encoding === 'hex' ? Buffer.from(clean.replace(/\s+/g, ''), 'hex') : Buffer.from(clean, 'base64');
      let out: Buffer;
      if (algorithm === 'brotli') {
        out = zlib.brotliDecompressSync(src);
      } else if (algorithm === 'deflate') {
        out = zlib.inflateSync(src);
      } else {
        out = zlib.gunzipSync(src);
      }
      res.json({ output: out.toString('utf8') });
    }
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Compression operation failed' });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[CyberChef-Dave Backend] Listening on http://127.0.0.1:${PORT}`);
});
