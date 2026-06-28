# AIvitaleye MVP Implementation Plan

## Architecture Overview
The MVP uses a decoupled, yet co-located architecture consisting of a React-based frontend and an Express-based Node.js backend serving as a BFF (Backend For Frontend) to the AI APIs.

## Tech Stack
*   **Frontend**: React 19, Vite (bundler), Tailwind CSS v4 (styling), `lucide-react` (icons), `motion` (animations).
*   **Backend**: Node.js, Express (`server.ts`).
*   **AI Integration**: `@google/genai` (Google SDK) and `fetch` (OpenRouter API).

## Component Design
1.  **Server (`server.ts`)**:
    *   Exposes endpoints: `/api/analyze-manual`, `/api/analyze-photo`, `/api/chat`.
    *   Holds the system prompt (`SYSTEM_INSTRUCTION`).
    *   Handles authentication and switching between OpenRouter and Gemini SDK securely.
2.  **App (`src/App.tsx`)**:
    *   Main container component handling global state (`reports`, `chatHistory`, active tab).
    *   Implements the Tab UI (Dashboard, Manual Analysis, Photo Analysis, Chat, History, Glossary).
3.  **Sub-components**:
    *   `IrisMapExplorer`: Interactive SVG or graphical map for viewing iridology zones.
    *   `ReportViewer`: Renders the Markdown clinical reports into a readable format.

## Deployment Strategy
*   Deployed on Railway.app.
*   The `package.json` build step compiles the Vite frontend into `dist/` and uses `esbuild` to compile `server.ts` into a CommonJS bundle (`dist/server.cjs`) to be run in production.
