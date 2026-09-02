# ADR 0009 — Runtime support and module format

English | [Русский](0009-runtime-and-module-format.ru.md)

Status: accepted

## Context

TextSieve targets browsers, Node.js, Bun and edge runtimes. Supporting both ESM and CommonJS would add a second build, conditional exports and dual-package compatibility risk.

Node.js 20 is end-of-life upstream, but TextSieve consumers require compatibility from Node.js 20 onward.

## Decision

The 0.1.x packages are ESM-only and declare `node >=20`. Runtime code must not import Node.js built-ins. CI tests Node.js 20.10, the latest Node.js 20 line, Node.js 22 and Node.js 24. Browser bundling is a release gate.

Node.js 20 compatibility is supported for the 0.1.x line, while documentation recommends an actively maintained LTS release for production use.

## Consequences

- One ESM artifact works across modern servers, bundlers and edge runtimes.
- CommonJS consumers must migrate to `import` or remain unsupported for 0.1.x.
- Node.js 20 defects are treated as release blockers even though upstream no longer provides security fixes.
- A future dual build remains possible through conditional exports without changing the TypeScript API.
