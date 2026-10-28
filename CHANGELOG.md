# Changelog

All notable changes to AliFullStack will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Added missing IPC channels to preload whitelist (`get-app-files`, `start-backend-server`, `start-frontend-server`, `create-missing-folder`, `roocode:login`, `roocode:logout`, `roocode:auth-status`, `roocode:auth-callback`, `log-client-error`, `neon:fake-connect`) so renderer IPC calls no longer throw "Invalid channel" errors.
- Fixed `stopApp` to clean up the `appStreams` listener map, preventing stale callbacks and potential memory leaks.
- Fixed `useRunApp` type signatures: `runApp` and `stopApp` now accept `number | null` for `appId` to match the `selectedAppIdAtom` type.

## [0.1.0] - 2026-10-28

### Added

- Initial release of AliFullStack — a free, local, open-source AI app builder.
- Electron-based desktop application with React renderer and TanStack Router.
- LLM integration via Vercel AI SDK supporting OpenAI, Anthropic, Google Gemini, Azure, AWS Bedrock, xAI, OpenRouter, Ollama, LM Studio, NVIDIA NIM, and custom OpenAI-compatible providers.
- SQLite database via Drizzle ORM for app, chat, message, and version persistence.
- Jotai state management and TanStack Query for server state.
- GitHub, Vercel, Supabase, and Neon integrations.
- Roo Code authentication and AliFullStack Pro support.
- Scaffold templates for React, Next.js, Vue 3, 3D, and backend frameworks (Django, FastAPI, Flask, Node.js).
- Unit tests (Vitest) and E2E tests (Playwright) with a fake LLM server.
- Auto-update via `update-electron-app` and deep link handling for OAuth flows.
