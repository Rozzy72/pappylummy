import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { loadUi } from "./ui-loader.mjs";

const ui = loadUi();
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const tokens = read("packages/tokens/src/tokens.css");
const css = read("src/app/globals.css");
const render = (Component, props, children) => renderToStaticMarkup(h(Component, props, children));
const colors = Object.fromEntries([...tokens.matchAll(/--sd-([\w-]+):\s*(#[a-f\d]{6});/g)].map((m) => [m[1], m[2]]));
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map((v) => parseInt(v, 16) / 255)
    .map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a, b) {
  const [lo, hi] = [luminance(colors[a]), luminance(colors[b])].sort((a, b) => a - b);
  return (hi + .05) / (lo + .05);
}

test("semantic text/action/status pairs meet WCAG AA normal-text contrast", () => {
  const pairs = [
    ["foreground", "background"], ["foreground", "surface"],
    ["foreground-muted", "background"], ["foreground-muted", "surface-muted"],
    ["foreground-inverse", "surface-inverse"], ["action-foreground", "action"],
    ["action-foreground", "action-hover"], ["brand-accent-foreground", "brand-accent"],
    ["brand-accent-foreground", "brand-accent-hover"],
    ...["success", "warning", "danger", "info"].map((v) => [v, "surface"]),
  ];
  for (const [a, b] of pairs) assert(contrast(a, b) >= 4.5, `${a}/${b}`);
});
test("focus and control boundaries meet 3:1 against intended surfaces", () => {
  for (const surface of ["background", "surface", "surface-muted", "brand-accent"])
    assert(contrast("focus-ring", surface) >= 3, surface);
  assert(contrast("focus-ring-inverse", "surface-inverse") >= 3);
  assert(contrast("border-strong", "surface") >= 3);
  assert.match(css, /outline: 3px solid/);
  assert.match(css, /box-shadow: 0 0 0 3px/);
  assert.match(css, /\[data-surface="inverse"\]/);
  assert.match(css, /\.sd-media > a:focus-visible/);
});
test("Box border is independent from radius and dark surfaces carry focus context", () => {
  const square = render(ui.Box, { border: true }, "Panel");
  assert.match(square, /border border-line/);
  assert.match(square, /rounded-none/);
  assert.doesNotMatch(square, /rounded-sdmd/);
  assert.match(render(ui.Box, { radius: "md" }), /rounded-sdmd/);
  assert.match(render(ui.Box, { surface: "brand" }), /data-surface="inverse"/);
});
test("heading visual roles do not depend on HTML level", () => {
  for (const as of ["h1", "h2", "h3", "h4"])
    assert.match(render(ui.Heading, { as, look: "display-lg" }, "Example"), new RegExp(`<${as} class="sd-type-display-lg`));
  assert.match(render(ui.Heading, { as: "h1", look: "heading" }), /sd-type-heading /);
  assert.match(render(ui.Text, { look: "body-small", measure: true }), /sd-measure-body/);
});
test("button variants preserve semantics, disabled/loading and pressed state", () => {
  for (const variant of ["primary", "secondary", "ghost", "text"])
    assert.match(render(ui.Button, { variant, "aria-pressed": true }, "Choose"), /type="button".*aria-pressed="true"/);
  assert.match(render(ui.Button, { loading: true }, "Save"), /disabled=""/);
  assert.match(render(ui.Button, { type: "submit" }, "Submit"), /type="submit"/);
  assert.match(render(ui.LinkButton, { href: "/shop" }, "Shop"), /<a.*href="\/shop"/);
});
test("IconButton requires a nonblank label and guarantees a 44px hit target", () => {
  assert.throws(() => render(ui.IconButton, { "aria-label": " " }), /accessible label/);
  assert.match(render(ui.IconButton, { "aria-label": "Save jersey", disabled: true }), /size-11/);
  assert.match(render(ui.IconButton, { "aria-label": "Save jersey" }), /aria-label="Save jersey"/);
});
test("merchandising badges are not status live regions", () => {
  for (const variant of ["new", "sale", "neutral"]) {
    const markup = render(ui.Badge, { variant }, variant);
    assert.doesNotMatch(markup, /role=|aria-live=/);
    assert.match(markup, /<span/);
  }
});
test("product and editorial media have independent crop contracts", () => {
  for (const kind of ["product", "thumbnail"])
    assert.match(render(ui.ImageFrame, { kind }), /object-contain/);
  assert.match(render(ui.ImageFrame, { kind: "lifestyle" }), /aspect-video.*object-cover/);
  assert.match(render(ui.ImageFrame, { kind: "portrait" }), /aspect-portrait.*object-cover/);
});
test("full bleed is explicit; standard Main and skip target remain available", () => {
  assert.match(render(ui.Main, {}, "Page"), /id="main-content".*tabindex="-1".*sd-main/);
  assert.match(render(ui.PageFrame, { width: "full-bleed" }), /data-page-width="full-bleed"/);
  assert.match(render(ui.PageContainer), /sd-container/);
  assert.match(css, /\.sd-main:has\(> \[data-page-width="full-bleed"\]\)/);
  assert.doesNotMatch(render(ui.AuthBackdrop), /-mx-|-my-|auth-action|auth-backdrop/);
});
test("section width, tone and spacing are independently selectable", () => {
  for (const width of ["contained", "full-bleed"])
    for (const tone of ["default", "muted", "inverse"])
      for (const spacing of ["compact", "standard", "editorial"]) {
        const markup = render(ui.Section, { width, tone, spacing, "aria-label": "Collection" });
        assert.equal(markup.includes("sd-container"), width === "contained");
        assert(markup.includes(`data-surface="${tone}"`));
        assert.match(markup, /aria-label="Collection"/);
      }
});
test("price describes original/current values without performing calculations", () => {
  const markup = render(ui.Price, { current: "₦25,000", original: "₦30,000" });
  assert.match(markup, /Current price:/);
  assert.match(markup, /Original price:/);
  assert.match(markup, /<del>₦30,000<\/del>/);
});
test("notices preserve caller live-region semantics and render text safely", () => {
  const markup = render(ui.Notice, { tone: "success", role: "status", "aria-live": "polite" }, "<script>example</script>");
  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /&lt;script&gt;/);
});
test("campaign copy is local and no obsolete orange/blue identity remains", () => {
  assert.doesNotMatch(read("packages/ui/src/jersey.tsx"), /CampaignHeading|Your club\.|The personal edition/);
  assert.match(read("src/components/home/campaign.tsx"), /YOUR TEAM\.<br \/>YOUR COLOURS\.<br \/><span>YOUR IDENTITY\.<\/span>/);
  assert.doesNotMatch(tokens, /#ff875b|#e5f0fc|#006ce5|#082747|sd-auth-/);
  assert.match(css, /prefers-reduced-motion/);
  assert.deepEqual(ui.CORE_SPACING, [0, 4, 8, 12, 16, 24, 32, 48, 64, 96]);
});
test("style guard limits editorial exception and retains raw colour/style restrictions", () => {
  const guard = read("scripts/style-guard.mjs");
  assert.match(guard, /path === "src\/components\/home\/campaign.tsx"/);
  assert.match(guard, /name === "style"/);
  assert.match(guard, /arbitrary utility value/);
  assert.match(guard, /raw color/);
});
test("actual Tailwind/PostCSS compilation resolves foundation tokens and variants", async () => {
  const result = await postcss([tailwind({ optimize: false })]).process(css, {
    from: fileURLToPath(new URL("../src/app/globals.css", import.meta.url)),
  });
  assert.equal(result.warnings().length, 0);
  for (const selector of [".bg-media", ".border-strong", ".aspect-portrait", ".sd-main", ".sd-type-display-xl"])
    assert(result.css.includes(selector), selector);
  assert.doesNotMatch(result.css, /var\(--sd-auth-/);
});
