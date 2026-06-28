# Project Constitution: AIvitaleye

## Purpose
AIvitaleye is a professional, clinical-grade Iridology diagnostic platform. It leverages Google Gemini AI models to analyze macroscopic images of the human iris, identifying biological terrain, constitutional subtypes, and specific physiological markers based on established iridology schools (Josef Deck, Bernard Jensen).

## Core Principles
1.  **Clinical Rigor**: The application must strictly use iridological and clinical terminology (e.g., stroma density, autonomic crown, lacunae).
2.  **No Formal Medical Diagnoses**: The AI must never output formal disease names (like "Cancer" or "Diabetes"). It must only report tissue states, functional weaknesses, and systemic toxicity.
3.  **Performance and UX**: The interface must remain extremely professional, responsive, and visually polished (using `lucide-react` icons, `framer-motion` for animations, and a clinical dark mode aesthetic).

## Tech Stack Requirements
*   **Frontend**: React 19, Vite, Tailwind CSS v4, TypeScript.
*   **Backend**: Node.js, Express, TypeScript.
*   **AI Integration**: `@google/genai` (for direct Gemini access) or `fetch` calls to OpenRouter (for `google/gemini-2.5-flash`).
*   **File Structure**: SPA architecture, frontend components in `src/`, backend in `server.ts`.

## Agent Guidelines
1.  **Strict SDD**: Follow Spec-Driven Development. Never write code for new features without generating `spec.md`, `plan.md`, and `tasks.md` first.
2.  **Code Quality**: Write strictly typed TypeScript. Do not use `any` unless absolutely necessary.
3.  **Environment Variables**: Ensure sensitive keys (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`) are kept out of source control.
