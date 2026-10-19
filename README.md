# Naija Kits

A Nigeria-focused football jersey storefront using Next.js App Router, Supabase and Zustand.

## Local development

Install the locked dependencies with `npm ci`, configure `.env.local` using `.env.example` and `docs/supabase-setup.md`, then run `npm run dev`. The storefront runs at http://localhost:3000. Supabase must be reachable for live catalogue reads. Never substitute fabricated products when catalogue reads fail.

## Styling

The approved styling-discipline policy is adapted to this single-app repository. Shared primitives are in `packages/ui` and imported as `@sd/ui`; semantic tokens are in `packages/tokens`. Application components use closed props rather than utility strings. `docs/styling-policy.md` records the CSS allowlist mapping and checks.

## Verification

- `npm run verify`: styling guard, TypeScript, application lint and production build.
- `npm test`: local regression tests with synthetic fixtures; no live database mutation.
- Lint covers application code, shared packages, scripts, tests and configuration. The pre-existing ignored local checkout runner is separate development tooling.

## Current scope

Catalogue, product discovery, guest cart/wishlist and authentication are implemented. Collection links filter the shop by team/category. Product images remain development previews. Checkout, payments, delivery terms, returns and verified sizing are unfinished. Checkout migration 003 remains an undeployed experiment. This redesign does not modify database migrations, credentials or authorization policies.
