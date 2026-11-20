import { OperationDefinition } from '../../types/engine';

async function postNodeApi(endpoint: string, body: Record<string, any>): Promise<string> {
  const candidates = [endpoint, `http://127.0.0.1:3001${endpoint}`];
  let lastError = 'Node backend unreachable';

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      if (!text) continue;
      const data = JSON.parse(text);
      if (!response.ok) {
        throw new Error(data.error || `Node backend error (${response.status})`);
      }
      return String(data.output ?? '');
    } catch (err: any) {
      lastError = err?.message || String(err);
      if (lastError && !lastError.includes('Failed to fetch') && !lastError.includes('JSON')) {
        throw err;
      }
    }
  }
  throw new Error(lastError);
}

function parseXorKey(keyStr: string, encoding: string): Uint8Array {
  if (!keyStr) {
    throw new Error('XOR Key cannot be empty.');
  }
  if (encoding === 'hex') {
    const clean = keyStr.replace(/[^0-9a-fA-F]/g, '');
    if (!clean || clean.length % 2 !== 0) {
      throw new Error('Hex XOR key must have an even number of hex digits.');
    }
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2) {
      out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
    }
    return out;
  }
  return new TextEncoder().encode(keyStr);
}

export const cryptoOperations: OperationDefinition[] = [
  {
    id: 'crypto_hash',
    name: 'Hash Digest (MD5 / SHA-2 / SHA-3)',
    category: 'Cryptography & Hashes',
    description: 'Computes cryptographic hash digests using Node.js native OpenSSL crypto bindings.',
    badge: 'Node.js',
    args: [
      {
        name: 'algorithm',
        label: 'Hash Algorithm',
        type: 'select',
        defaultValue: 'sha256',
        options: [
          { label: 'SHA-256', value: 'sha256' },
          { label: 'SHA-512', value: 'sha512' },
          { label: 'SHA-384', value: 'sha384' },
          { label: 'SHA-1', value: 'sha1' },
          { label: 'MD5', value: 'md5' },
          { label: 'SHA3-256', value: 'sha3-256' },
          { label: 'SHA3-512', value: 'sha3-512' },
          { label: 'RIPEMD-160', value: 'ripemd160' },
        ],
      },
      {
        name: 'outputEncoding',
        label: 'Output Format',
        type: 'select',
        defaultValue: 'hex',
        options: [
          { label: 'Hexadecimal', value: 'hex' },
          { label: 'Base64', value: 'base64' },
        ],
      },
    ],
    execute: (input, args) =>
      postNodeApi('/api/crypto/hash', {
        input,
        algorithm: args.algorithm || 'sha256',
        outputEncoding: args.outputEncoding || 'hex',
      }),
  },
  {
    id: 'crypto_hmac',
    name: 'HMAC Signature',
    category: 'Cryptography & Hashes',
    description: 'Generates a keyed-hash message authentication code (HMAC) using Node.js native crypto.',
    badge: 'Node.js',
    args: [
      {
        name: 'hmacKey',
        label: 'Secret Key',
        type: 'text',
        defaultValue: 'secret-key',
        placeholder: 'Enter HMAC secret key...',
      },
      {
        name: 'keyEncoding',
        label: 'Key Encoding',
        type: 'select',
        defaultValue: 'utf8',
        options: [
          { label: 'UTF-8 String', value: 'utf8' },
          { label: 'Hex', value: 'hex' },
          { label: 'Base64', value: 'base64' },
        ],
      },
      {
        name: 'algorithm',
        label: 'Digest Algorithm',
        type: 'select',
        defaultValue: 'sha256',
        options: [
          { label: 'SHA-256', value: 'sha256' },
          { label: 'SHA-512', value: 'sha512' },
          { label: 'SHA-1', value: 'sha1' },
          { label: 'MD5', value: 'md5' },
        ],
      },
      {
        name: 'outputEncoding',
        label: 'Output Format',
        type: 'select',
        defaultValue: 'hex',
        options: [
          { label: 'Hexadecimal', value: 'hex' },
          { label: 'Base64', value: 'base64' },
        ],
      },
    ],
    execute: (input, args) =>
      postNodeApi('/api/crypto/hash', {
        input,
        hmacKey: args.hmacKey,
        keyEncoding: args.keyEncoding,
        algorithm: args.algorithm,
        outputEncoding: args.outputEncoding,
      }),
  },
  {
    id: 'crypto_kdf',
    name: 'Key Derivation (PBKDF2 / Scrypt)',
    category: 'Cryptography & Hashes',
    description: 'Derives cryptographic keys from passwords using Node.js native PBKDF2 or Scrypt.',
    badge: 'Node.js',
    args: [
      {
        name: 'mode',
        label: 'KDF Algorithm',
        type: 'select',
        defaultValue: 'pbkdf2',
        options: [
          { label: 'PBKDF2 (SHA-256)', value: 'pbkdf2' },
          { label: 'Scrypt (N=16384, r=8, p=1)', value: 'scrypt' },
        ],
      },
      {
        name: 'salt',
        label: 'Salt (UTF-8)',
        type: 'text',
        defaultValue: 'cyberchef-dave-salt',
      },
      {
        name: 'iterations',
        label: 'Iterations (PBKDF2)',
        type: 'number',
        defaultValue: 100000,
      },
      {
        name: 'keyLength',
        label: 'Key Length (Bytes)',
        type: 'number',
        defaultValue: 32,
      },
    ],
    execute: (input, args) =>
      postNodeApi('/api/crypto/kdf', {
        password: input,
        mode: args.mode,
        salt: args.salt,
        iterations: args.iterations,
        keyLength: args.keyLength,
      }),
  },
  {
    id: 'aes_encrypt',
    name: 'AES Encrypt (GCM / CBC)',
    category: 'Ciphers & Compression',
    description: 'Encrypts input using AES-256-GCM (authenticated) or AES-256-CBC via Node.js crypto.',
    badge: 'Node.js',
    args: [
      {
        name: 'mode',
        label: 'Cipher Mode',
        type: 'select',
        defaultValue: 'aes-256-gcm',
        options: [
          { label: 'AES-256-GCM (Authenticated)', value: 'aes-256-gcm' },
          { label: 'AES-256-CBC', value: 'aes-256-cbc' },
        ],
      },
      {
        name: 'key',
        label: 'Passphrase / Key',
        type: 'text',
        defaultValue: 'my-super-secret-passphrase',
      },
      {
        name: 'keyEncoding',
        label: 'Key Format',
        type: 'select',
        defaultValue: 'utf8',
        options: [
          { label: 'UTF-8 Passphrase (SHA-256 derived)', value: 'utf8' },
          { label: 'Raw 32-Byte Hex Key', value: 'hex' },
          { label: 'Raw 32-Byte Base64 Key', value: 'base64' },
        ],
      },
      {
        name: 'outputEncoding',
        label: 'Ciphertext Encoding',
        type: 'select',
        defaultValue: 'base64',
        options: [
          { label: 'Base64', value: 'base64' },
          { label: 'Hexadecimal', value: 'hex' },
        ],
      },
    ],
    execute: (input, args) =>
      postNodeApi('/api/crypto/aes', {
        input,
        action: 'encrypt',
        mode: args.mode,
        key: args.key,
        keyEncoding: args.keyEncoding,
        outputEncoding: args.outputEncoding,
      }),
  },
  {
    id: 'aes_decrypt',
    name: 'AES Decrypt (GCM / CBC)',
    category: 'Ciphers & Compression',
    description: 'Decrypts AES-256-GCM or AES-256-CBC payloads produced by AES Encrypt.',
    badge: 'Node.js',
    args: [
      {
        name: 'mode',
        label: 'Cipher Mode',
        type: 'select',
        defaultValue: 'aes-256-gcm',
        options: [
          { label: 'AES-256-GCM (Authenticated)', value: 'aes-256-gcm' },
          { label: 'AES-256-CBC', value: 'aes-256-cbc' },
        ],
      },
      {
        name: 'key',
        label: 'Passphrase / Key',
        type: 'text',
        defaultValue: 'my-super-secret-passphrase',
      },
      {
        name: 'keyEncoding',
        label: 'Key Format',
        type: 'select',
        defaultValue: 'utf8',
        options: [
          { label: 'UTF-8 Passphrase (SHA-256 derived)', value: 'utf8' },
          { label: 'Raw 32-Byte Hex Key', value: 'hex' },
          { label: 'Raw 32-Byte Base64 Key', value: 'base64' },
        ],
      },
      {
        name: 'outputEncoding',
        label: 'Input Ciphertext Format',
        type: 'select',
        defaultValue: 'base64',
        options: [
          { label: 'Base64', value: 'base64' },
          { label: 'Hexadecimal', value: 'hex' },
        ],
      },
    ],
    execute: (input, args) =>
      postNodeApi('/api/crypto/aes', {
        input,
        action: 'decrypt',
        mode: args.mode,
        key: args.key,
        keyEncoding: args.keyEncoding,
        outputEncoding: args.outputEncoding,
      }),
  },
  {
    id: 'xor_cipher',
    name: 'XOR Cipher',
    category: 'Ciphers & Compression',
    description: 'Applies repeating-key bytewise XOR against the input (reversible symmetric transform).',
    badge: 'Client',
    args: [
      {
        name: 'key',
        label: 'XOR Key',
        type: 'text',
        defaultValue: '42',
        placeholder: 'Key string or hex bytes...',
      },
      {
        name: 'keyEncoding',
        label: 'Key Format',
        type: 'select',
        defaultValue: 'hex',
        options: [
          { label: 'Hex Bytes (e.g. 42 or deadbeef)', value: 'hex' },
          { label: 'UTF-8 Text', value: 'utf8' },
        ],
      },
    ],
    execute: (input, args) => {
      const inputBytes = new TextEncoder().encode(input);
      const keyBytes = parseXorKey(String(args.key ?? '42'), String(args.keyEncoding ?? 'hex'));
      const out = new Uint8Array(inputBytes.length);
      for (let i = 0; i < inputBytes.length; i++) {
        out[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length];
      }
      return new TextDecoder('utf-8', { fatal: false }).decode(out);
    },
  },
  {
    id: 'rot13',
    name: 'ROT13 / Caesar Shift',
    category: 'Ciphers & Compression',
    description: 'Rotates ASCII letters (A-Z, a-z) by a configurable shift (default 13).',
    badge: 'Client',
    args: [
      {
        name: 'shift',
        label: 'Shift Amount (1-25)',
        type: 'number',
        defaultValue: 13,
      },
    ],
    execute: (input, args) => {
      const shift = (((Number(args.shift) || 13) % 26) + 26) % 26;
      return input.replace(/[a-zA-Z]/g, (ch) => {
        const base = ch <= 'Z' ? 65 : 97;
        return String.fromCharCode(((ch.charCodeAt(0) - base + shift) % 26) + base);
      });
    },
  },
  {
    id: 'rot47',
    name: 'ROT47 Cipher',
    category: 'Ciphers & Compression',
    description: 'Rotates printable ASCII characters (! through ~, ASCII 33-126) by 47 positions.',
    badge: 'Client',
    args: [],
    execute: (input) => {
      return input.replace(/[\x21-\x7e]/g, (ch) => {
        return String.fromCharCode(33 + ((ch.charCodeAt(0) - 33 + 47) % 94));
      });
    },
  },
  {
    id: 'zlib_compress',
    name: 'Compress (Gzip / Deflate / Brotli)',
    category: 'Ciphers & Compression',
    description: 'Compresses input data using Node.js native zlib and outputs Base64 or Hex.',
    badge: 'Node.js',
    args: [
      {
        name: 'algorithm',
        label: 'Algorithm',
        type: 'select',
        defaultValue: 'gzip',
        options: [
          { label: 'Gzip', value: 'gzip' },
          { label: 'Deflate', value: 'deflate' },
          { label: 'Brotli', value: 'brotli' },
        ],
      },
      {
        name: 'encoding',
        label: 'Output Encoding',
        type: 'select',
        defaultValue: 'base64',
        options: [
          { label: 'Base64', value: 'base64' },
          { label: 'Hexadecimal', value: 'hex' },
        ],
      },
    ],
    execute: (input, args) =>
      postNodeApi('/api/crypto/zlib', {
        input,
        action: 'compress',
        algorithm: args.algorithm,
        encoding: args.encoding,
      }),
  },
  {
    id: 'zlib_decompress',
    name: 'Decompress (Gzip / Deflate / Brotli)',
    category: 'Ciphers & Compression',
    description: 'Decompresses Base64 or Hex encoded Gzip, Deflate, or Brotli archives via Node.js zlib.',
    badge: 'Node.js',
    args: [
      {
        name: 'algorithm',
        label: 'Algorithm',
        type: 'select',
        defaultValue: 'gzip',
        options: [
          { label: 'Gzip', value: 'gzip' },
          { label: 'Deflate', value: 'deflate' },
          { label: 'Brotli', value: 'brotli' },
        ],
      },
      {
        name: 'encoding',
        label: 'Input Encoding',
        type: 'select',
        defaultValue: 'base64',
        options: [
          { label: 'Base64', value: 'base64' },
          { label: 'Hexadecimal', value: 'hex' },
        ],
      },
    ],
    execute: (input, args) =>
      postNodeApi('/api/crypto/zlib', {
        input,
        action: 'decompress',
        algorithm: args.algorithm,
        encoding: args.encoding,
      }),
  },
];
