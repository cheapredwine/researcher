# Researcher

## Required setup

1. Install Node.js 20+ and npm.
2. Install Cloudflare Wrangler if you want local development and deployment.
3. Configure a GitHub secret named `CLOUDFLARE_API_TOKEN` for deploys.
4. Ensure the Cloudflare Worker has an AI binding available as `env.AI`.

## Local setup

From the project root:

```bash
npm install
```

## Validate locally

```bash
npm run build
npm run typecheck
npm run test
```

## Run locally

```bash
wrangler dev
```

## Deploy

```bash
npm run deploy
```

## GitHub Actions

A push to `main` triggers the workflow in `.github/workflows/deploy.yml`, which:

- installs dependencies
- builds the project
- typechecks the code
- runs tests
- deploys to Cloudflare
