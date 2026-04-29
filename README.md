# Company Research Agent

A Cloudflare Worker that orchestrates a four-agent research pipeline for structured company analysis.

## Structure

- `src/index.ts` — Worker entrypoint and orchestration logic
- `AGENTS.md` — architecture and prompt definitions
- `.github/workflows/deploy.yml` — CI/CD deploy workflow
- `package.json` — build and deploy scripts
- `tsconfig.json` — TypeScript configuration
- `wrangler.toml` — Cloudflare Worker config

## Installation

1. Install Node.js 20 or later and npm.
   - On Linux/macOS, use your package manager or download from the official Node.js site.
   - On Windows, install Node.js from the official installer.
2. From the project root, install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Build or typecheck the project:
   ```bash
   npm run build
   npm run typecheck
   ```
2. Run tests:
   ```bash
   npm run test
   ```
3. Deploy with Wrangler:
   ```bash
   npm run deploy
   ```
4. Query the worker with `?company=<CompanyName>`.

## VS Code Tasks

- Open the Command Palette and run `Tasks: Run Task`.
- Use `Install dependencies`, `Build TypeScript`, `Typecheck`, or `Deploy Cloudflare Worker`.

## Notes

- The worker uses `env.AI.run` to call planner, researcher, validator, and synthesizer agents.
- All agent outputs are validated as JSON.
- If agent output is malformed, the worker returns structured error details.
