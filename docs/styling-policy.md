# Naija Kits styling policy

We borrowed semantic-token and controlled-variant principles from styling-discipline. We are refining this project's existing foundation, not reproducing that repository, adding a library, or converting to a monorepo. `@sd/ui` remains the local TypeScript alias.

## Ownership

Recurring appearance lives in `packages/ui`; raw colours and shared values live in `packages/tokens/src/tokens.css`. The only stylesheets are that file and `src/app/globals.css`. Application code uses controlled UI props. Inline styles remain forbidden except the root Next.js font-variable classes. No arbitrary Tailwind values.

Controlled editorial compositions may live with marketing sections. The current narrowly reviewed className exceptions are `src/components/home/campaign.tsx` and `src/components/home/football-discovery.tsx`; it still uses shared tokens and is checked for raw colours/arbitrary values. Add explicit guard entries only for reviewed compositions. Do not exempt whole app directories. Campaign copy belongs to the home composition, not generic typography primitives. Replace superseded styling rather than layer new overrides.

## Visual language

PappyLummy uses white / light-grey surfaces, dark forest sections and an emerald accent. Primary commerce actions use accessible forest green. Auth uses this same vocabulary; no separate blue theme. Jersey palette tokens describe garment artwork, not interface status or brand colours.

Typography: Inter body, Montserrat headings; Geist Mono for restrained metadata. Heading `as` selects semantics; `look` independently selects display-xl (48�112px), display-lg (40�80), heading-lg (32�48), heading (24�32), body (16), body-small (14), meta (12). Optional `measure` limits body to 65ch and headings to 22ch. Legacy Text look aliases remain supported. No marketing copy in generic Heading.

Core spacing in pixels: 0, 4, 8, 12, 16, 24, 32, 48, 64, 96. Existing indexed space props remain compatible: 0/1/2/3/4/6/8/9/10/11 map to this core. Steps 5 (20px) and 7 (28px) are legacy only; do not use them in new compositions. Page gutter and standard/editorial section spacing have semantic responsive tokens.

Borders do not imply radii. Box defaults square even with border; request radius explicitly. Controls use 4px, panels 8px, editorial imagery square. Full radius is for genuinely circular controls, not default CTAs.

Buttons: primary, secondary, ghost, text. Legacy solid/surface/outline/link and accent soft remain compatibility variants, not a parallel system. IconButton requires a nonblank accessible label and 44px target. Badge new/sale/neutral is decorative merchandising; it is separate from Notice success/warning/danger/info feedback. Notice preserves caller-supplied status/alert semantics and does not invent live-region behavior.

ImageFrame: product / thumbnail contain the whole garment; lifestyle (16:9) / portrait (4:5) crop intentionally. Existing card/detail/hero/thumb/studio aliases remain. ImageFrame does not resolve or validate image sources; ProductImage retains that boundary.

## Containment

Normal pages keep Main's contained width, gutters, and block padding. A page may opt in with a direct `<PageFrame width="full-bleed">` child. Main then spans the viewport without negative margins. Within it use `<Section width="full-bleed" tone="inverse" spacing="editorial"><PageContainer>...</PageContainer></Section>` for a full-width surface with constrained inner content, or contained Section for a bounded region. Width, tone and spacing are independent. The opt-in uses modern CSS :has; unsupported browsers fall back to containment. This stage supplies the contract; the homepage section order/content is not redesigned.

Two-colour focus uses a 3px ring and contrasting halo; inverse surfaces switch the ring context and nested surfaces reset it. Keep skip links, pressed state, reduced motion, mobile Escape and focus restoration. Do not change the disclosure interaction to a modal.

## Validation and boundaries

Run `npm run guard`, `npm run typecheck`, `npm run lint`, and affected offline frontend tests. `npm run verify` includes a production build: do not run it when the task prohibits a build. Never weaken functional/security tests to satisfy styling changes. Do not change product trust, auth, checkout, price calculations, persistence, local security tools, or environment configuration during presentation work. No invented commercial promises. Existing previews and unfinished checkout remain honestly labelled.
