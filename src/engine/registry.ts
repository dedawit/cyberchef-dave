import { OperationCategory, OperationDefinition, PresetRecipe } from '../types/engine';
import { encodingOperations } from './operations/encoding';
import { cryptoOperations } from './operations/crypto';
import { textOperations } from './operations/text';

export const ALL_OPERATIONS: OperationDefinition[] = [
  ...encodingOperations,
  ...cryptoOperations,
  ...textOperations,
];

export const OPERATION_MAP = new Map<string, OperationDefinition>(
  ALL_OPERATIONS.map((op) => [op.id, op])
);

export const CATEGORIES: OperationCategory[] = [
  'Data Encodings',
  'Cryptography & Hashes',
  'Ciphers & Compression',
  'Code & Data Formats',
  'Text & Extractors',
];

export const PRESET_RECIPES: PresetRecipe[] = [
  {
    id: 'multi-layer-decode',
    name: 'Multi-Layer Payload Unpack (Hex -> Base64 -> JSON)',
    description: 'Demonstrates the Step-by-Step Inspector unpacking a hex-wrapped Base64 JSON payload.',
    sampleInput:
      '65 79 4a 68 5a 32 56 75 64 43 49 36 49 6b 4e 35 59 6d 56 79 51 32 68 6c 5a 69 31 45 59 58 5a 6c 49 6a 77 69 63 33 52 68 64 48 56 7a 49 6a 6f 69 62 32 35 73 61 57 35 6c 49 69 77 69 62 47 56 32 5a 57 77 69 4f 6a 6c 39',
    steps: [
      { operationId: 'from_hex' },
      { operationId: 'from_base64' },
      { operationId: 'json_format', args: { mode: '2', sortKeys: true } },
    ],
  },
  {
    id: 'jwt-audit',
    name: 'JWT Security Token Inspector',
    description: 'Decodes a JSON Web Token and checks issued/expiration claims.',
    sampleInput:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRave-key-01In0.eyJzdWIiOiJ1c2VyXzkwMDEiLCJuYW1lIjoiRGF2ZSBTZWN1cml0eSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczMjA5OTIwMCwiZXhwIjoxOTg5OTUyMDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    steps: [{ operationId: 'jwt_decode', args: { section: 'full' } }],
  },
  {
    id: 'aes-roundtrip',
    name: 'Node.js AES-256-GCM Encrypt -> Decrypt Roundtrip',
    description: 'Encrypts plaintext with authenticated AES-256-GCM on Node.js and immediately verifies decryption.',
    sampleInput: 'Confidential SOC Incident #4821: C2 beacon detected on 10.24.8.19:8443',
    steps: [
      {
        operationId: 'aes_encrypt',
        args: {
          mode: 'aes-256-gcm',
          key: 'incident-response-master-key',
          keyEncoding: 'utf8',
          outputEncoding: 'base64',
        },
      },
      {
        operationId: 'aes_decrypt',
        args: {
          mode: 'aes-256-gcm',
          key: 'incident-response-master-key',
          keyEncoding: 'utf8',
          outputEncoding: 'base64',
        },
      },
    ],
  },
  {
    id: 'ioc-defang-pipeline',
    name: 'Threat Intel IOC Extractor & Defanger',
    description: 'Extracts URLs/domains and converts them to safe defanged format for incident reports.',
    sampleInput:
      'Phishing callback observed at https://login-update-portal.example.com/auth?id=991 and fallback http://198.51.100.42:8080/gate.php',
    steps: [
      {
        operationId: 'regex_extract',
        args: {
          pattern: 'https?://[^\\s"\']+',
          flags: 'gi',
          outputFormat: 'lines',
        },
      },
      {
        operationId: 'defang_ioc',
        args: { direction: 'defang' },
      },
    ],
  },
];
