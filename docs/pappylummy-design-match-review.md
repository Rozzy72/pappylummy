# PappyLummy design review

The existing Next.js application now follows the supplied JerseyKits board's desktop and mobile composition while retaining the approved PappyLummy name and existing catalogue.

## Implemented

- White desktop navigation with a green shirt mark, current-page indicator and outline shopping/account icons.
- Full-width stadium hero with a dark left copy area, three-line football heading, emerald emphasis and pill actions. The mobile hero is approximately 209px tall with reduced text and button sizes.
- Eight compact club tiles and four photographic category cards on desktop. Mobile uses category shortcuts, four visible scrolling club tiles and a two-column product grid.
- Five featured products across desktop, each with live catalogue prices, available size chips, wishlist controls and working add-to-cart. Trying to add without selecting a size gives feedback.
- Compact Make It Yours banner and dark footer.
- Product detail gallery with selectable thumbnails, existing photos, sizes/quantity and optional name/number printing using the existing validation and fee.
- Compact customisation layout, live name/number overlays, smaller number typography and eleven separate generated back illustrations. Changing jersey updates its artwork and resets size while retaining entered lettering. The Actual jersey control uses the original validated product photo.
- Stacked cart panel with existing unit/line totals, quantities and removal; optional printing details remain accessible.

## Changed source files

- `packages/ui/src/index.tsx`
- `src/app/globals.css`
- `src/app/cart/page.tsx`
- `src/app/product/[slug]/page.tsx`
- `src/components/layout/header.tsx`
- `src/components/layout/store-navigation.tsx` (new)
- `src/components/cart/cart-link.tsx`
- `src/components/cart/cart-contents.tsx`
- `src/components/cart/cart-line.tsx`
- `src/components/product/product-card.tsx`
- `src/components/product/product-card-actions.tsx` (new)
- `src/components/product/product-actions.tsx`
- `src/components/product/product-gallery.tsx`
- `src/components/home/hero.tsx`
- `src/components/home/campaign.tsx`
- `src/components/home/new-arrivals.tsx`
- `src/components/home/football-discovery.tsx`
- `src/components/home/make-it-yours.tsx`
- `src/components/customizer/jersey-studio.tsx`
- `src/components/customizer/product-lettering-preview.tsx`
- Presentation/regression expectations in `tests/homepage-presentation.test.mjs`, `tests/storefront-cutover.test.mjs`, `tests/sign-out-header.test.mjs` and `tests/product-lettering-preview.test.mjs`.

Six promotional images are under `public/campaigns/pappylummy-*-v2.png`. Eleven back illustrations are under `public/illustrations/backs/*-v1.png`. Prompt/provenance records are included with this review and copied into the project's docs folder.

## Verification

- `npm run verify`: styling guard, TypeScript, ESLint and production build passed.
- `npm test`: 313 passed, 0 failed.
- Browser checked homepage, Arsenal product detail, customisation and cart at 320, 390, 768 and 1350px; none had horizontal page overflow.
- Mobile navigation closes with Escape, returns focus to its trigger and displays a focus outline.
- Browser quick add selected Arsenal M and added exactly that selection.
- Product-page printing added Arsenal L with PAPPY / 10 at the existing ₦35,000 base plus ₦5,000 fee. Alongside the plain M item the cart subtotal was ₦75,000. Increasing/decreasing the plain item updated the subtotal to ₦110,000 and back.
- Each of the eleven available jersey options selected its own local back illustration. Switching from Arsenal to Barcelona retained PAPPY / 10, changed artwork and cleared size.
- Test cart items were removed after verification.

## Boundaries and remaining differences

The layout and controls follow the visual reference; this is not a claim that generated artwork is a pixel-identical copy of the original. PappyLummy branding and the actual catalogue names, prices, sizes, merchandising flags and existing product photos intentionally differ from the board's example content.

Generated backs are explicitly labelled illustrations, not verified back-of-garment photographs. Unknown future products fall back to the existing neutral illustration. Generated assets are kept outside the validated catalogue-image pipeline and selected through a fixed allowlist.

Unverified ratings, authenticity promises and delivery timelines were not copied. Track-order, live payment and WhatsApp services were not invented. Existing checkout remains an order preview. The font-style selector remains a visual preview, as before; it does not create a new fulfilment option.

No environment variables, credentials, database access policies or authentication authority changed. No new external scripts or dependencies were added. Production build passed; visual interaction tests used the local development server, not a public deployment. The previously noted production-image optimisation behaviour still needs a separate check before publishing.

The repository already contained extensive uncommitted work, so no commit/reset was performed. Before-images of edited files were retained under the workspace's `project-transfer/match-before/` folder.
