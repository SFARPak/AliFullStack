# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.0.6] - 2025-11-29

### Features
- Add Vue 3 support to AliFullStack
- Add 3D Landing Page template with React Three Fiber
- Add 3D Landing Page template to hub
- Add automatic triggers for release workflow
- Enhance UI components and template selection
- Enhance backend HTTP request logging in System Messages
- Add fullstack environment and database integration
- Comprehensive UI and framework improvements

### Fixes
- Fix asset verification to match actual electron-forge naming (alifullstack lowercase)
- Remove sharding from CI workflow, run tests in single job
- Remove Windows from CI workflow matrix, keep only macOS
- Remove package-lock.json from cleanup step to fix npm cache paths
- Update PowerShell compatibility for dependency cleanup
- Make cleanup step cross-platform compatible
- Remove package-lock.json from workflow cleanup step
- Ensure React scaffold has proper JSX runtime support
- Add leaflet dependencies to Vue scaffold
- Correct prettier configuration in Roo-Code directory
- Correct syntax error in Node.js backend server template literal
- Update scaffold lockfiles to fix CI frozen-lockfile errors
- Fix GitHub Actions CI by removing private repository clone
- Fix pnpm version conflict in GitHub Actions CI
- Fix npm package name with capital letters issue
- Fix terminal command execution with proper working directory support
- Change npm ci to npm install in CI workflow
- Ensure local database is created during app creation, not just app execution
- Improve Flask/Django HTTP log detection with better regex pattern
- Improve Flask/Django HTTP request log detection in System Messages
- Improve backend HTTP request log visibility in System Messages
- Fix GitHub Actions token authentication for release verification
- Fix GITHUB_TOKEN 403 error by removing /user endpoint check
- Remove problematic token permission checking from verify-release-assets.js
- Fix remaining Roo-Code merge conflicts
- Fix remaining scaffold-vue merge conflicts
- Resolve merge conflicts by accepting release/v0.0.5 versions
- Fix merge conflict in package.json: resolve @dyad-sh/supabase-management-js version to 1.0.0
- Update scaffold AI_RULES.md and add AI_RULES_3D.md
- Update AI_RULES for all backend frameworks

### Chores
- Version bump to 0.0.6 and update asset verification script
- Version bump to 0.1.0 - Vue 3 support release
- Version bump to 0.0.45 - stable release with all backend fixes
- Version bump to 0.1.8 - stable release with all backend fixes
- Version bump to 1.0.0 - major release with all consolidated fixes
- Bump version to 0.24.5
- Version 0.24.4 - Final database persistence release
- Version 0.24.1 - Database persistence fixes and enhancements
- Synchronize package.json and package-lock.json to version 0.0.5
- Update README.md
- App instructions to run in development mode
- Trigger CI build for testing PowerShell fixes
- Merge main branch and resolve conflicts
- Merge release/v0.0.5 into main
- Workflow and verify assets updated by copilot
- Create separate scaffold-3d directory for 3D landing page template
- Fixed verify-release-assets.js from chatgpt