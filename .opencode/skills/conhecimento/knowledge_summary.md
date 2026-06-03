# Knowledge Summary

## Project Overview
- **Project name**: `wsm-ai`
- **Purpose**: A static web UI that interacts with AI models (Groq, OpenRouter) via Vercel serverless functions.
- **Main entry point**: `index.html` (static client).
- **Serverless API**: Located under `api/` with three endpoints:
  - `config.js` – Returns available API keys from Vercel environment variables.
  - `extract.js` – Calls Tavily *extract* API to retrieve content from a URL.
  - `search.js` – Calls Tavily *search* API to perform a web search.
- **Supporting files**: `api-config-example.js` (example endpoint), `check-vercel.sh` (quick Vercel setup verification script), `vercel.json`, static assets (`logo.png`, `oi.gif`, `oi.mp4`).
- **Package**: Minimal `package.json` with placeholder scripts; no runtime dependencies.

## Coding Conventions
- **Language**: JavaScript (ES modules). All serverless handlers use `export default async function handler(req, res) {}`.
- **Asynchronous**: `async/await` with `try/catch` for external API calls.
- **CORS**: Explicit `Access‑Control‑Allow‑*` headers; `OPTIONS` pre‑flight handling returns early.
- **Error handling**: Returns JSON with an `error` field and appropriate HTTP status codes (400, 405, 500). Console logs use emojis for quick visual cues.
- **Environment variables**: Accessed via `process.env.<NAME>`; keys are validated early and missing key errors include helpful hints.
- **Logging**: `console.log` for success messages, `console.error` for failures, both prefixed with emojis.
- **Response shape**: Consistent JSON containing a `message` field and, when relevant, `results`, `failed_results`, `answer`, `images`.

## Architectural Patterns
- **Serverless Vercel functions**: Plain JavaScript files exported as default handlers, relying on Vercel's automatic routing.
- **API key fallback on client**: The client-side script in `index.html` overrides `window.fetch` for Groq/OpenRouter endpoints to:
  1. Attempt the request with the original options.
  2. On failure, fetch `/api/config` to retrieve a list of keys.
  3. Retry the request with each key until a successful response.
- **Separation of concerns**:
  - UI lives entirely in the static `index.html` (plus CDN assets).
  - Backend logic is limited to thin wrappers around external APIs (Tavily, Groq/OpenRouter). No business logic or database.
- **Configuration as code**: `check-vercel.sh` validates presence of required files/keys and guides the developer through Git steps.

## UI / Front‑end Details
- No build step; static HTML served directly.
- Uses CSS custom properties for theming and layout.
- External libraries via CDN:
  - Fonts: Inter, Lora.
  - Icons: Tabler, Lucide.
  - Markdown rendering: `markdown-it`.
  - Syntax highlighting: `highlight.js`.
  - Map: Leaflet.
- JavaScript in the page includes:
  - A fetch‑interceptor for adding Authorization headers.
  - MathJax configuration for LaTeX support.
  - UI helpers for auto‑resizing input, handling Enter key, etc.
- Responsive layout using CSS grid; sidebar and main chat area.

## Testing / Build
- No test framework configured.
- `package.json` scripts are placeholders (`dev` and `build` simply echo messages).
- Deployment target is Vercel; the `vercel.json` file (not inspected here) likely configures the serverless functions.

## Summary
The repository follows a lightweight, serverless‑first architecture: a static front‑end that talks to Vercel‑hosted JavaScript handlers which proxy calls to external AI services. Code style emphasizes clear async flows, explicit CORS handling, robust environment‑variable checks, and consistent JSON responses. UI styling relies heavily on CSS variables and external CDN assets, with no custom build pipeline.
