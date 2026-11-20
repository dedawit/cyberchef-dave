import { OperationDefinition } from '../../types/engine';

export const textOperations: OperationDefinition[] = [
  {
    id: 'json_format',
    name: 'JSON Beautify / Minify',
    category: 'Code & Data Formats',
    description: 'Formats, validates, sorts keys, or minifies JSON payloads.',
    badge: 'Client',
    args: [
      {
        name: 'mode',
        label: 'Format Mode',
        type: 'select',
        defaultValue: '2',
        options: [
          { label: 'Beautify (2 Spaces)', value: '2' },
          { label: 'Beautify (4 Spaces)', value: '4' },
          { label: 'Minify (Compact)', value: '0' },
        ],
      },
      {
        name: 'sortKeys',
        label: 'Sort Object Keys Alphabetically',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    execute: (input, args) => {
      if (!input.trim()) return '';
      const parsed = JSON.parse(input);
      const sortRecursive = (val: any): any => {
        if (Array.isArray(val)) return val.map(sortRecursive);
        if (val !== null && typeof val === 'object') {
          return Object.keys(val)
            .sort()
            .reduce((acc: Record<string, any>, key) => {
              acc[key] = sortRecursive(val[key]);
              return acc;
            }, {});
        }
        return val;
      };
      const target = args.sortKeys ? sortRecursive(parsed) : parsed;
      const indent = Number(args.mode);
      return indent === 0 ? JSON.stringify(target) : JSON.stringify(target, null, indent);
    },
  },
  {
    id: 'json_extract_path',
    name: 'JSON Property Extractor',
    category: 'Code & Data Formats',
    description: 'Extracts a nested property or array slice using dot/bracket path notation (e.g. user.roles[0]).',
    badge: 'Client',
    args: [
      {
        name: 'path',
        label: 'Dot Path (e.g. data.items[0].name)',
        type: 'text',
        defaultValue: '',
        placeholder: 'data.user.email',
      },
    ],
    execute: (input, args) => {
      if (!input.trim()) return '';
      const parsed = JSON.parse(input);
      const rawPath = String(args.path || '').trim();
      if (!rawPath) return JSON.stringify(parsed, null, 2);

      const tokens = rawPath
        .replace(/\[(\d+)\]/g, '.$1')
        .split('.')
        .filter(Boolean);

      let current: any = parsed;
      for (const token of tokens) {
        if (current === null || current === undefined) {
          throw new Error(`Path segment '${token}' not found.`);
        }
        current = current[token];
      }
      return typeof current === 'object' ? JSON.stringify(current, null, 2) : String(current ?? '');
    },
  },
  {
    id: 'url_parse',
    name: 'URL & Query String Inspector',
    category: 'Code & Data Formats',
    description: 'Parses a URL into protocol, host, port, pathname, hash, and decoded query parameters.',
    badge: 'Client',
    args: [],
    execute: (input) => {
      const trimmed = input.trim();
      if (!trimmed) return '';
      const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
      const params: Record<string, string | string[]> = {};
      url.searchParams.forEach((value, key) => {
        if (key in params) {
          const existing = params[key];
          params[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
        } else {
          params[key] = value;
        }
      });
      return JSON.stringify(
        {
          href: url.href,
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || '(default)',
          pathname: url.pathname,
          queryParams: params,
          hash: url.hash || '(none)',
        },
        null,
        2
      );
    },
  },
  {
    id: 'timestamp_convert',
    name: 'Unix Timestamp / Epoch Converter',
    category: 'Code & Data Formats',
    description: 'Converts between Unix Epoch (seconds, ms, μs) and ISO-8601 / UTC / Local dates.',
    badge: 'Client',
    args: [
      {
        name: 'mode',
        label: 'Conversion Mode',
        type: 'select',
        defaultValue: 'auto',
        options: [
          { label: 'Auto-Detect (Epoch <-> ISO)', value: 'auto' },
          { label: 'Date String -> Unix Seconds', value: 'to_sec' },
          { label: 'Date String -> Unix Milliseconds', value: 'to_ms' },
        ],
      },
    ],
    execute: (input, args) => {
      const raw = input.trim();
      if (!raw) {
        const now = new Date();
        return JSON.stringify(
          {
            note: 'Current System Time (input was empty)',
            unixSeconds: Math.floor(now.getTime() / 1000),
            unixMilliseconds: now.getTime(),
            iso8601: now.toISOString(),
            utc: now.toUTCString(),
          },
          null,
          2
        );
      }

      if (/^\d{9,16}$/.test(raw) && args.mode === 'auto') {
        const num = Number(raw);
        let ms = num;
        let unit = 'milliseconds';
        if (raw.length <= 10) {
          ms = num * 1000;
          unit = 'seconds';
        } else if (raw.length >= 15) {
          ms = Math.floor(num / 1000);
          unit = 'microseconds';
        }
        const dt = new Date(ms);
        return JSON.stringify(
          {
            detectedInputUnit: unit,
            iso8601: dt.toISOString(),
            utc: dt.toUTCString(),
            localTime: dt.toString(),
            unixSeconds: Math.floor(ms / 1000),
            unixMilliseconds: ms,
          },
          null,
          2
        );
      }

      const parsedMs = Date.parse(raw);
      if (Number.isNaN(parsedMs)) {
        throw new Error(`Unable to parse timestamp or date string: "${raw}"`);
      }
      if (args.mode === 'to_sec') return String(Math.floor(parsedMs / 1000));
      if (args.mode === 'to_ms') return String(parsedMs);
      const dt = new Date(parsedMs);
      return JSON.stringify(
        {
          iso8601: dt.toISOString(),
          unixSeconds: Math.floor(parsedMs / 1000),
          unixMilliseconds: parsedMs,
          utc: dt.toUTCString(),
        },
        null,
        2
      );
    },
  },
  {
    id: 'regex_extract',
    name: 'Regex Extractor & Matcher',
    category: 'Text & Extractors',
    description: 'Finds all matches (or capture groups) for a regular expression across the input.',
    badge: 'Client',
    args: [
      {
        name: 'pattern',
        label: 'Regular Expression',
        type: 'text',
        defaultValue: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
        placeholder: 'e.g. https?://[^\\s"\']+',
      },
      {
        name: 'flags',
        label: 'Regex Flags',
        type: 'text',
        defaultValue: 'gi',
      },
      {
        name: 'outputFormat',
        label: 'Output Style',
        type: 'select',
        defaultValue: 'lines',
        options: [
          { label: 'Matched Strings (One per line)', value: 'lines' },
          { label: 'Detailed Match + Capture Groups (JSON)', value: 'json' },
        ],
      },
    ],
    execute: (input, args) => {
      const pattern = String(args.pattern || '');
      if (!pattern) return input;
      const rawFlags = String(args.flags || 'g');
      const flags = rawFlags.includes('g') ? rawFlags : `${rawFlags}g`;
      const regex = new RegExp(pattern, flags);
      const matches = Array.from(input.matchAll(regex));
      if (args.outputFormat === 'json') {
        return JSON.stringify(
          matches.map((m, idx) => ({
            matchIndex: idx,
            fullMatch: m[0],
            index: m.index,
            captureGroups: m.slice(1),
          })),
          null,
          2
        );
      }
      return matches.map((m) => m[0]).join('\n');
    },
  },
  {
    id: 'find_replace',
    name: 'Find / Replace',
    category: 'Text & Extractors',
    description: 'Replaces occurrences of a literal string or regular expression pattern.',
    badge: 'Client',
    args: [
      {
        name: 'find',
        label: 'Find Pattern',
        type: 'text',
        defaultValue: '',
      },
      {
        name: 'replace',
        label: 'Replace With',
        type: 'text',
        defaultValue: '',
      },
      {
        name: 'useRegex',
        label: 'Use Regular Expression',
        type: 'boolean',
        defaultValue: true,
      },
      {
        name: 'ignoreCase',
        label: 'Case Insensitive',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    execute: (input, args) => {
      const findStr = String(args.find ?? '');
      if (!findStr) return input;
      const replaceStr = String(args.replace ?? '').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      const flags = args.ignoreCase ? 'gi' : 'g';
      if (args.useRegex) {
        return input.replace(new RegExp(findStr, flags), replaceStr);
      }
      const escaped = findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return input.replace(new RegExp(escaped, flags), replaceStr);
    },
  },
  {
    id: 'line_operations',
    name: 'Sort / Unique / Filter Lines',
    category: 'Text & Extractors',
    description: 'Sorts lines alphabetically or numerically, deduplicates lines, and removes blank lines.',
    badge: 'Client',
    args: [
      {
        name: 'sortOrder',
        label: 'Sort Order',
        type: 'select',
        defaultValue: 'asc',
        options: [
          { label: 'A -> Z (Ascending)', value: 'asc' },
          { label: 'Z -> A (Descending)', value: 'desc' },
          { label: 'Numeric Ascending', value: 'num_asc' },
          { label: 'Line Length', value: 'length' },
          { label: 'Keep Original Order', value: 'none' },
        ],
      },
      {
        name: 'unique',
        label: 'Deduplicate (Unique Only)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'removeEmpty',
        label: 'Remove Empty Lines',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    execute: (input, args) => {
      let lines = input.split(/\r?\n/);
      if (args.removeEmpty) {
        lines = lines.filter((l) => l.trim().length > 0);
      }
      if (args.unique) {
        lines = Array.from(new Set(lines));
      }
      switch (args.sortOrder) {
        case 'asc':
          lines.sort((a, b) => a.localeCompare(b));
          break;
        case 'desc':
          lines.sort((a, b) => b.localeCompare(a));
          break;
        case 'num_asc':
          lines.sort((a, b) => parseFloat(a) - parseFloat(b));
          break;
        case 'length':
          lines.sort((a, b) => a.length - b.length);
          break;
      }
      return lines.join('\n');
    },
  },
  {
    id: 'case_convert',
    name: 'Case & Naming Converter',
    category: 'Text & Extractors',
    description: 'Transforms text between UPPERCASE, lowercase, Title Case, camelCase, snake_case, and kebab-case.',
    badge: 'Client',
    args: [
      {
        name: 'style',
        label: 'Target Case',
        type: 'select',
        defaultValue: 'lower',
        options: [
          { label: 'lowercase', value: 'lower' },
          { label: 'UPPERCASE', value: 'upper' },
          { label: 'Title Case', value: 'title' },
          { label: 'camelCase', value: 'camel' },
          { label: 'snake_case', value: 'snake' },
          { label: 'kebab-case', value: 'kebab' },
        ],
      },
    ],
    execute: (input, args) => {
      switch (args.style) {
        case 'upper':
          return input.toUpperCase();
        case 'title':
          return input.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
        case 'camel': {
          const words = input.trim().split(/[\s_-]+/);
          return words
            .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
            .join('');
        }
        case 'snake':
          return input
            .trim()
            .replace(/([a-z\d])([A-Z])/g, '$1_$2')
            .replace(/[\s-]+/g, '_')
            .toLowerCase();
        case 'kebab':
          return input
            .trim()
            .replace(/([a-z\d])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
        default:
          return input.toLowerCase();
      }
    },
  },
  {
    id: 'reverse_text',
    name: 'Reverse Characters / Lines',
    category: 'Text & Extractors',
    description: 'Reverses characters in the string or reverses the order of lines.',
    badge: 'Client',
    args: [
      {
        name: 'mode',
        label: 'Reverse Mode',
        type: 'select',
        defaultValue: 'chars',
        options: [
          { label: 'Reverse Characters', value: 'chars' },
          { label: 'Reverse Line Order', value: 'lines' },
        ],
      },
    ],
    execute: (input, args) => {
      if (args.mode === 'lines') {
        return input.split(/\r?\n/).reverse().join('\n');
      }
      return Array.from(input).reverse().join('');
    },
  },
  {
    id: 'defang_ioc',
    name: 'Defang / Refang URLs & IPs',
    category: 'Text & Extractors',
    description: 'Neutralizes (hxxps://, [.], [at]) or restores IOCs (URLs, domains, IPs, emails) for threat reports.',
    badge: 'Client',
    args: [
      {
        name: 'direction',
        label: 'Action',
        type: 'select',
        defaultValue: 'defang',
        options: [
          { label: 'Defang (Safe for sharing)', value: 'defang' },
          { label: 'Refang (Restore live URLs/IPs)', value: 'refang' },
        ],
      },
    ],
    execute: (input, args) => {
      if (args.direction === 'refang') {
        return input
          .replace(/hxxps/gi, 'https')
          .replace(/hxxp/gi, 'http')
          .replace(/\[\.\]/g, '.')
          .replace(/\(\.\)/g, '.')
          .replace(/\[dot\]/gi, '.')
          .replace(/\[:\]/g, ':')
          .replace(/\[@\]|\[at\]/gi, '@');
      }
      return input
        .replace(/https:\/\//gi, 'hxxps[://]')
        .replace(/http:\/\//gi, 'hxxp[://]')
        .replace(/\./g, '[.]')
        .replace(/@/g, '[@]');
    },
  },
];
