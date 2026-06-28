# AIvitaleye MVP Tasks

> Note: This document was retroactively generated to record the tasks completed during the AI Studio export phase.

## Phase 1: Project Scaffolding
- [x] Initialize Vite + React + TypeScript project.
- [x] Configure Tailwind CSS v4.
- [x] Set up Express backend (`server.ts`) with Vite middleware.

## Phase 2: AI Integration
- [x] Implement `callAIService` function in backend.
- [x] Add fallback mechanism between `@google/genai` and `OpenRouter`.
- [x] Inject clinical Iridology System Prompt.

## Phase 3: API Endpoints
- [x] Create POST `/api/analyze-manual`.
- [x] Create POST `/api/analyze-photo` with Base64 image support.
- [x] Create POST `/api/chat` with history management.

## Phase 4: Frontend Implementation
- [x] Create main Dashboard layout with Sidebar navigation.
- [x] Implement Manual Analysis Form with clinical dropdowns.
- [x] Implement Photo Upload interface.
- [x] Implement Chat interface.
- [x] Create `IrisMapExplorer` SVG component.
- [x] Create `ReportViewer` for markdown rendering.

## Phase 5: Deployment
- [x] Configure `build` script with `esbuild` for production server.
- [x] Deploy to Railway and configure ENV variables.
