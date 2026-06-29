# Webflow Dashboard Svelte

Standalone SvelteKit source for the Webflow Asset Dashboard.

This repository was exported from `createsomethingtoday/create-something-monorepo`:

- source package: `packages/webflow-dashboard`
- shared local package: `packages/webflow-dashboard-core`
- minimal local Canon shim: `packages/canon`
- source commit: `bb51fca37ae14a4b1b322ee563c1d29fbf8def74`

## Local Development

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

## Deployment

The live Cloudflare Pages project is `webflow-dashboard`.

```bash
pnpm build
pnpm deploy
```

Required Cloudflare Pages secrets are documented in `ENVIRONMENT_SETUP.md`.
