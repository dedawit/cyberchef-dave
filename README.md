# CyberChef-Dave

**CyberChef-Dave** is an open-source, self-hosted data transformation, encoding, cryptography, and defensive security workbench built from scratch with **Node.js, React, TypeScript, and Tailwind CSS**.

Inspired by GCHQ's open-source [CyberChef](https://github.com/gchq/CyberChef), CyberChef-Dave combines zero-latency client-side operations with a **native Node.js backend (`node:crypto` & `node:zlib`)** and a **Step-by-Step Pipeline Inspector** that lets you inspect or pin the intermediate output after every single step in a recipe.

---

## Features

### 1. Step-by-Step Pipeline Inspector
- **Inline Step Preview:** Expand any step in your recipe to inspect the exact intermediate output, byte count, and execution time (`ms`) at that stage.
- **Pin Any Step to Main Workbench:** Click the Pin icon on any recipe step to inspect its output in full screen (Text, Hex Dump, or Side-by-Side Diff) without deleting later steps.
- **Breakpoints & Bypass Toggles:** Pause pipeline execution after any step or temporarily disable steps to debug complex multi-layer payloads.

### 2. Hybrid Client + Node.js Execution Engine
- **Instant Client Operations (`Fast`):** Base64, Base32, Hex, Binary, URL Encode/Decode, HTML Entities, JWT Decode & Expiration Inspector, XOR, ROT13/ROT47, JSON Formatter & Path Extractor, Regex Extractor, Timestamp Converter, and IOC Defang/Refang.
- **Native Node.js Operations (`Node`):**
  - **Cryptographic Hashes:** MD5, SHA-1, SHA-256, SHA-384, SHA-512, SHA3-256, SHA3-512, RIPEMD-160 via OpenSSL bindings.
  - **HMAC Signatures:** Keyed-hash message authentication with UTF-8, Hex, or Base64 keys.
  - **Key Derivation (KDF):** Native `PBKDF2` and `Scrypt` key derivation.
  - **Authenticated AES Encryption/Decryption:** `AES-256-GCM` (with authentication tag verification) and `AES-256-CBC`.
  - **Native Compression:** `Gzip`, `Deflate`, and `Brotli` compression and decompression via `node:zlib`.

### 3. Multi-Mode Output Workbench
- Switch seamlessly between **Raw Text**, **Formatted Hex Dump (Offset + Hex + ASCII)**, and **Side-by-Side Line Diff (Input vs. Output)**.
- One-click **Use Output as Input**, file upload, clipboard copy, and `.txt` export.

---

## Quick Start

### Prerequisites
- **Node.js** v18+ (tested with Node.js v20)
- **npm** v9+

### Installation & Development
```bash
# 1. Install dependencies
npm install

# 2. Start both the Node.js backend (:3001) and Vite frontend (:5173)
npm run dev
```

Open **`http://localhost:5173`** in your browser.

### Production Build
```bash
npm run build
```

---

## Project Structure

```text
CyberChef-Dave/
├── server/
│   └── index.ts                 # Express + native node:crypto & node:zlib API
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx          # Searchable operation catalog & demo presets
│   │   ├── RecipePipeline.tsx   # Recipe builder & Step-by-Step Inspector
│   │   └── Workbench.tsx        # Input/Output editors with Text, Hex & Diff views
│   ├── engine/
│   │   ├── operations/
│   │   │   ├── encoding.ts      # Base64, Hex, URL, Binary, Base32, HTML, JWT
│   │   │   ├── crypto.ts        # SHA/MD5/SHA3, HMAC, PBKDF2/Scrypt, AES, XOR, Zlib
│   │   │   └── text.ts          # JSON, Regex, Timestamps, Lines, Case, Defang
│   │   ├── registry.ts          # Operation registry & quick-start preset recipes
│   │   └── runner.ts            # Sequential pipeline runner with per-step snapshots
│   ├── types/
│   │   └── engine.ts            # TypeScript interfaces
│   ├── App.tsx                  # Main 3-pane studio layout
│   └── main.tsx                 # Application entry point
└── package.json
```

---

## Responsible Use & License

This software is a general-purpose developer, data analysis, and defensive cybersecurity utility (encoding, decoding, formatting, hashing, and log/token inspection). All processing runs locally on your own machine.

Released under the **MIT License**.
