# CyberChef-Dave — Architecture & Phased Roadmap Tracker

This file tracks architecture decisions, commands, and phase completion status so any session can resume immediately with minimal token usage.

## Commands
- **Install dependencies:** `npm install`
- **Start full-stack dev server (Backend :3001 + Frontend :5173):** `npm run dev`
- **Typecheck:** `npm run typecheck`
- **Build production bundle:** `npm run build`

## Architecture Overview
- **Backend (`server/index.ts`):** Express server on port `3001` (proxied via Vite `/api`). Provides native Node.js `crypto` (MD5, SHA-1/256/384/512, SHA3, RIPEMD160, HMAC, AES-GCM, AES-CBC, Scrypt/PBKDF2) and `zlib` (Gzip/Deflate/Brotli) endpoints.
- **Core Pipeline Engine (`src/types/engine.ts`, `src/engine/`):**
  - `src/engine/operations/encoding.ts`: Base64, Hex, URL, Binary, Base32, HTML Entities, JWT Decode & Inspector, Unicode Escape.
  - `src/engine/operations/crypto.ts`: Hashes (MD5/SHA-1/256/384/512/SHA3/RIPEMD-160), HMAC, AES-GCM/CBC Encrypt & Decrypt, PBKDF2/Scrypt Key Derivation, XOR Cipher, ROT13/ROT47, Caesar Cipher, Gzip/Deflate Compress & Decompress.
  - `src/engine/operations/text.ts`: JSON Beautify/Minify & Query, Regex Tester & Extractor, Find/Replace, Sort/Unique/Filter Lines, Case Converter, Reverse, Unix Timestamp Converter, UUID/Random Token Generator, URL Parser.
  - `src/engine/runner.ts`: Sequential pipeline execution engine that snapshots intermediate output, byte size, duration (`ms`), and status after **every step** for the Step-by-Step Pipeline Inspector.
- **3-Pane Studio UI (`src/components/`):**
  - `Sidebar.tsx`: Categorized operation palette with fuzzy search, favorites, and preset recipes.
  - `RecipePipeline.tsx`: Interactive recipe builder with step reordering, enable/disable breakpoint toggles, parameter editors, and **Inline Step-by-Step Output Inspector** (expand or pin any step to inspect intermediate results).
  - `Workbench.tsx`: Split Input/Output workspace with sample payloads, file upload, "Use Output as Input", and Output view modes (**Text**, **Hex Preview**, and **Diff View**).

## Phase Status
- [x] **Phase 1:** Foundation, Modern 3-Pane UI Shell, Step-by-Step Pipeline Inspector & 28+ Core MVP Operations (Encodings, Node Crypto, Text/Data)
- [ ] **Phase 2:** Forensics & Binary File Analysis Suite (Interactive Hex Dump viewer with offset/byte hover sync, 60+ Magic Bytes File Signature detector, Shannon Entropy analyzer & block chart, Strings extractor, Byte frequency histogram)
- [ ] **Phase 3:** Smart "Magic" Auto-Detector Banner, `Ctrl+K` Command Palette, Multi-Tab Workspaces, Saved Recipes, and Custom JS Transform step
- [ ] **Phase 4:** Node.js Network & OSINT Operations (DNS Resolver, TLS/SSL Certificate Inspector, CORS-free HTTP Probe, IPv4/IPv6 Subnet Calculator, Defang/Refang) + CLI/REST API runner
