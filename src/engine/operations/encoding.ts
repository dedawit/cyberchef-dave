import { OperationDefinition } from '../../types/engine';

function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function bytesToBase64(bytes: Uint8Array, urlSafe = false, stripPadding = false): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  let b64 = btoa(binary);
  if (urlSafe) {
    b64 = b64.replace(/\+/g, '-').replace(/\//g, '_');
  }
  if (stripPadding) {
    b64 = b64.replace(/=+$/, '');
  }
  return b64;
}

function base64ToBytes(b64: string): Uint8Array {
  let clean = b64.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  while (clean.length % 4 !== 0) {
    clean += '=';
  }
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(bytes: Uint8Array, pad = true): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  if (pad) {
    while (output.length % 8 !== 0) {
      output += '=';
    }
  }
  return output;
}

function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character '${clean[i]}' at position ${i}`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export const encodingOperations: OperationDefinition[] = [
  {
    id: 'to_base64',
    name: 'To Base64',
    category: 'Data Encodings',
    description: 'Encodes raw UTF-8 text into Base64 (supports standard or URL-safe alphabet).',
    badge: 'Client',
    args: [
      {
        name: 'urlSafe',
        label: 'URL-Safe (- and _)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'stripPadding',
        label: 'Strip "=" Padding',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    execute: (input, args) => {
      return bytesToBase64(utf8ToBytes(input), Boolean(args.urlSafe), Boolean(args.stripPadding));
    },
  },
  {
    id: 'from_base64',
    name: 'From Base64',
    category: 'Data Encodings',
    description: 'Decodes Base64 or Base64URL strings back into UTF-8 text.',
    badge: 'Client',
    args: [],
    execute: (input) => {
      if (!input.trim()) return '';
      return bytesToUtf8(base64ToBytes(input));
    },
  },
  {
    id: 'to_hex',
    name: 'To Hex',
    category: 'Data Encodings',
    description: 'Converts text bytes into hexadecimal representation with configurable delimiter.',
    badge: 'Client',
    args: [
      {
        name: 'delimiter',
        label: 'Delimiter',
        type: 'select',
        defaultValue: 'space',
        options: [
          { label: 'Space (aa bb)', value: 'space' },
          { label: 'None (aabb)', value: 'none' },
          { label: 'Colon (aa:bb)', value: 'colon' },
          { label: '0x Prefix (0xaa, 0xbb)', value: '0x' },
          { label: '\\x Escape (\\xaa\\xbb)', value: 'xescape' },
        ],
      },
      {
        name: 'uppercase',
        label: 'Uppercase Hex',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    execute: (input, args) => {
      const bytes = utf8ToBytes(input);
      const hexParts = Array.from(bytes).map((b) => {
        const h = b.toString(16).padStart(2, '0');
        return args.uppercase ? h.toUpperCase() : h;
      });
      switch (args.delimiter) {
        case 'none':
          return hexParts.join('');
        case 'colon':
          return hexParts.join(':');
        case '0x':
          return hexParts.map((h) => `0x${h}`).join(', ');
        case 'xescape':
          return hexParts.map((h) => `\\x${h}`).join('');
        default:
          return hexParts.join(' ');
      }
    },
  },
  {
    id: 'from_hex',
    name: 'From Hex',
    category: 'Data Encodings',
    description: 'Decodes hexadecimal strings (supports spaces, colons, 0x prefixes, or \\x escapes) into text.',
    badge: 'Client',
    args: [],
    execute: (input) => {
      if (!input.trim()) return '';
      const clean = input
        .replace(/0x/gi, '')
        .replace(/\\x/gi, '')
        .replace(/[^0-9a-fA-F]/g, '');
      if (clean.length % 2 !== 0) {
        throw new Error('Hex string must have an even number of hex nibbles.');
      }
      const bytes = new Uint8Array(clean.length / 2);
      for (let i = 0; i < clean.length; i += 2) {
        bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
      }
      return bytesToUtf8(bytes);
    },
  },
  {
    id: 'url_encode',
    name: 'URL Encode',
    category: 'Data Encodings',
    description: 'Percent-encodes special characters for safe transmission in URLs and query parameters.',
    badge: 'Client',
    args: [
      {
        name: 'encodeAll',
        label: 'Encode All Characters',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    execute: (input, args) => {
      if (args.encodeAll) {
        return Array.from(utf8ToBytes(input))
          .map((b) => `%${b.toString(16).padStart(2, '0').toUpperCase()}`)
          .join('');
      }
      return encodeURIComponent(input);
    },
  },
  {
    id: 'url_decode',
    name: 'URL Decode',
    category: 'Data Encodings',
    description: 'Decodes percent-encoded URL strings (including + to space option).',
    badge: 'Client',
    args: [
      {
        name: 'plusAsSpace',
        label: 'Treat "+" as Space',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    execute: (input, args) => {
      const prepared = args.plusAsSpace ? input.replace(/\+/g, '%20') : input;
      return decodeURIComponent(prepared);
    },
  },
  {
    id: 'to_binary',
    name: 'To Binary',
    category: 'Data Encodings',
    description: 'Converts each byte of the input into 8-bit binary strings (01000001).',
    badge: 'Client',
    args: [
      {
        name: 'delimiter',
        label: 'Byte Separator',
        type: 'select',
        defaultValue: ' ',
        options: [
          { label: 'Space', value: ' ' },
          { label: 'None', value: '' },
        ],
      },
    ],
    execute: (input, args) => {
      const bytes = utf8ToBytes(input);
      return Array.from(bytes)
        .map((b) => b.toString(2).padStart(8, '0'))
        .join(String(args.delimiter ?? ' '));
    },
  },
  {
    id: 'from_binary',
    name: 'From Binary',
    category: 'Data Encodings',
    description: 'Converts 8-bit binary sequences (0 and 1) back into UTF-8 text.',
    badge: 'Client',
    args: [],
    execute: (input) => {
      const clean = input.replace(/[^01]/g, '');
      if (!clean) return '';
      if (clean.length % 8 !== 0) {
        throw new Error(`Binary stream length (${clean.length} bits) is not a multiple of 8.`);
      }
      const bytes = new Uint8Array(clean.length / 8);
      for (let i = 0; i < clean.length; i += 8) {
        bytes[i / 8] = parseInt(clean.slice(i, i + 8), 2);
      }
      return bytesToUtf8(bytes);
    },
  },
  {
    id: 'to_base32',
    name: 'To Base32',
    category: 'Data Encodings',
    description: 'Encodes input bytes using the RFC 4648 Base32 alphabet (A-Z, 2-7).',
    badge: 'Client',
    args: [
      {
        name: 'pad',
        label: 'Include "=" Padding',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    execute: (input, args) => base32Encode(utf8ToBytes(input), Boolean(args.pad)),
  },
  {
    id: 'from_base32',
    name: 'From Base32',
    category: 'Data Encodings',
    description: 'Decodes RFC 4648 Base32 strings back into UTF-8 text.',
    badge: 'Client',
    args: [],
    execute: (input) => {
      if (!input.trim()) return '';
      return bytesToUtf8(base32Decode(input));
    },
  },
  {
    id: 'html_entity_encode',
    name: 'To HTML Entities',
    category: 'Data Encodings',
    description: 'Escapes HTML characters (<, >, &, ", \') or encodes all characters as numeric HTML entities.',
    badge: 'Client',
    args: [
      {
        name: 'encodeAll',
        label: 'Numeric Entities for All Chars',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    execute: (input, args) => {
      if (args.encodeAll) {
        return Array.from(input)
          .map((ch) => `&#x${ch.codePointAt(0)?.toString(16)};`)
          .join('');
      }
      return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
  },
  {
    id: 'html_entity_decode',
    name: 'From HTML Entities',
    category: 'Data Encodings',
    description: 'Unescapes named and numeric HTML entities (&lt;, &#x3c;, &#60;) back to characters.',
    badge: 'Client',
    args: [],
    execute: (input) => {
      const doc = new DOMParser().parseFromString(input, 'text/html');
      return doc.documentElement.textContent || '';
    },
  },
  {
    id: 'jwt_decode',
    name: 'JWT Decode & Inspect',
    category: 'Data Encodings',
    description: 'Parses JSON Web Tokens (JWT) into structured Header, Payload, Signature, and token expiration status.',
    badge: 'Client',
    args: [
      {
        name: 'section',
        label: 'Output Section',
        type: 'select',
        defaultValue: 'full',
        options: [
          { label: 'Full Inspection Report (JSON)', value: 'full' },
          { label: 'Payload Only (JSON)', value: 'payload' },
          { label: 'Header Only (JSON)', value: 'header' },
        ],
      },
    ],
    execute: (input, args) => {
      const token = input.trim().replace(/^Bearer\s+/i, '');
      const parts = token.split('.');
      if (parts.length < 2 || parts.length > 3) {
        throw new Error('Invalid JWT format: expected header.payload.signature');
      }
      const headerJson = JSON.parse(bytesToUtf8(base64ToBytes(parts[0])));
      const payloadJson = JSON.parse(bytesToUtf8(base64ToBytes(parts[1])));

      if (args.section === 'payload') {
        return JSON.stringify(payloadJson, null, 2);
      }
      if (args.section === 'header') {
        return JSON.stringify(headerJson, null, 2);
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const timestamps: Record<string, string> = {};
      if (typeof payloadJson.iat === 'number') {
        timestamps.issuedAt = new Date(payloadJson.iat * 1000).toISOString();
      }
      if (typeof payloadJson.nbf === 'number') {
        timestamps.notBefore = new Date(payloadJson.nbf * 1000).toISOString();
      }
      if (typeof payloadJson.exp === 'number') {
        const expired = nowSec >= payloadJson.exp;
        timestamps.expiresAt = `${new Date(payloadJson.exp * 1000).toISOString()} (${expired ? 'EXPIRED' : 'VALID'})`;
      }

      return JSON.stringify(
        {
          header: headerJson,
          payload: payloadJson,
          signatureBase64Url: parts[2] || '(none)',
          tokenDiagnostics: timestamps,
        },
        null,
        2
      );
    },
  },
];
