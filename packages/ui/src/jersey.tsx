import * as React from "react";
export const KIT_PALETTES = [
  "forest",
  "scarlet",
  "royal",
  "gold",
  "ink",
  "paper",
] as const;
export type KitPalette = (typeof KIT_PALETTES)[number];
export type JerseyPreviewProps = {
  name?: string;
  number?: string;
  palette?: KitPalette;
  secondaryPalette?: KitPalette;
  pattern?: "solid" | "stripes" | "sleeves";
  view?: "front" | "back";
  id?: string;
};
/** Schematic garment artwork. All colors come from the shared token palette. */
export function JerseyPreview({
  name = "YOUR NAME",
  number = "10",
  palette = "forest",
  secondaryPalette = "paper",
  pattern = "solid",
  view = "back",
  id,
}: JerseyPreviewProps) {
  const uid = React.useId().replaceAll(":", "");
  const light = palette === "paper" || palette === "gold";
  const body = `var(--sd-kit-${palette})`;
  const ink = light ? "var(--sd-kit-ink)" : "var(--sd-kit-print)";
  return (
    <svg
      id={id}
      role="img"
      aria-label={`${view === "back" ? "Back" : "Front"} jersey preview${view === "back" ? `: ${name || "no name"}, number ${number || "none"}` : ""}`}
      viewBox="0 0 480 510"
      className="relative z-10 h-auto w-full max-w-lg drop-shadow-xl"
    >
      <defs>
        <clipPath id={`${uid}-shirt`}>
          <path d="M174 52 115 74 32 166 102 222 131 191 119 448Q240 480 361 448L349 191 378 222 448 166 365 74 306 52Q240 81 174 52Z" />
        </clipPath>
        <linearGradient id={`${uid}-light`} x1="0" x2="1">
          <stop stopColor="var(--sd-kit-seam)" stopOpacity=".18" />
          <stop
            offset=".35"
            stopColor="var(--sd-kit-print)"
            stopOpacity=".09"
          />
          <stop offset=".7" stopColor="var(--sd-kit-print)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--sd-kit-seam)" stopOpacity=".25" />
        </linearGradient>
        <pattern
          id={`${uid}-texture`}
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 0h5"
            stroke="var(--sd-kit-print)"
            strokeOpacity=".08"
            strokeWidth=".6"
          />
        </pattern>
      </defs>
      <ellipse
        cx="240"
        cy="480"
        rx="125"
        ry="12"
        fill="var(--sd-kit-shadow)"
        opacity=".25"
      />
      <path
        d="M174 52 115 74 32 166 102 222 131 191 119 448Q240 480 361 448L349 191 378 222 448 166 365 74 306 52Q240 81 174 52Z"
        fill={body}
        stroke="var(--sd-kit-seam)"
        strokeOpacity=".18"
        strokeWidth="2"
      />
      <path
        d="M174 52 115 74 32 166 102 222 131 191 119 448Q240 480 361 448L349 191 378 222 448 166 365 74 306 52Q240 81 174 52Z"
        fill={`url(#${uid}-texture)`}
      />
      {pattern !== "solid" && (
        <g clipPath={`url(#${uid}-shirt)`} fill={`var(--sd-kit-${secondaryPalette})`}>
          {pattern === "stripes" ? <><rect x="145" y="52" width="45" height="410" /><rect x="235" y="52" width="45" height="410" /><rect x="325" y="52" width="45" height="410" /></> : <><path d="M0 40H115L131 191 102 222H0Z" /><path d="M480 40H365L349 191 378 222H480Z" /></>}
        </g>
      )}
      <path
        d="M174 52 115 74 32 166 102 222 131 191 119 448Q240 480 361 448L349 191 378 222 448 166 365 74 306 52Q240 81 174 52Z"
        fill={`url(#${uid}-light)`}
      />
      <path
        d="m43 153 71 56m252 0 71-56"
        stroke={ink}
        strokeWidth="10"
        opacity=".95"
      />
      <path d="M174 52Q240 88 306 52L296 72Q240 107 184 72Z" fill={ink} />
      <path d="M175 55Q240 87 305 55" stroke={body} strokeWidth="4" />
      <path
        d="M116 76q26 59 15 115m234-115q-26 59-16 115M127 439q113 24 226 0"
        stroke={ink}
        strokeOpacity=".16"
        fill="none"
      />
      {view === "back" ? (
        <g fill={ink} textAnchor="middle" fontFamily="Arial, sans-serif">
          <text
            x="240"
            y="159"
            fontWeight="700"
            fontSize="25"
            letterSpacing="2"
            textLength={name.length >= 8 ? 200 : undefined}
            lengthAdjust="spacingAndGlyphs"
          >
            {name.toUpperCase()}
          </text>
          <text
            x="240"
            y="280"
            fontSize="88"
            fontWeight="900"
            letterSpacing="0"
          >
            {number}
          </text>
          <text x="240" y="405" fontSize="9" letterSpacing="4">
            MADE PERSONAL
          </text>
        </g>
      ) : (
        <g fill={ink}>
          <path
            d="M290 129h35v34l-17 14-18-14Z"
            fill="none"
            stroke={ink}
            strokeWidth="2"
          />
          <text
            x="307"
            y="155"
            textAnchor="middle"
            fontSize="12"
            fontFamily="Arial"
            fontWeight="700"
          >
            NK
          </text>
          <path d="m154 139 25-9-9 17Z" />
          <text
            x="240"
            y="254"
            textAnchor="middle"
            fontFamily="Arial"
            fontSize="38"
            fontWeight="900"
            letterSpacing="-2"
          >
            NAIJA
          </text>
          <text
            x="240"
            y="277"
            textAnchor="middle"
            fontFamily="Arial"
            fontSize="11"
            letterSpacing="6"
          >
            FOOTBALL CULTURE
          </text>
        </g>
      )}
    </svg>
  );
}
export function StudioStage({
  children,
  hero = false,
}: React.PropsWithChildren<{ hero?: boolean }>) {
  return (
    <div
      className={`pl-studio-stage relative isolate flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-sdlg bg-material p-s4 sm:p-s8 ${hero ? "min-h-80" : "min-h-96"}`}
    >
      <div
        aria-hidden="true"
        className="absolute size-80 rounded-full border border-line sm:size-96"
      />
      <div
        aria-hidden="true"
        className="absolute size-64 rounded-full border border-line sm:size-80"
      />
      {children}
    </div>
  );
}
export function StudioLayout({
  preview,
  controls,
}: {
  preview: React.ReactNode;
  controls: React.ReactNode;
}) {
  return (
    <div className="pl-studio-layout grid overflow-hidden rounded-sdlg bg-paper lg:grid-cols-2">
      <div className="pl-studio-preview bg-paper p-s4 sm:p-s6">{preview}</div>
      <div className="pl-studio-form p-s6 sm:p-s9">{controls}</div>
    </div>
  );
}
export function SectionRule({ children }: React.PropsWithChildren) {
  return (
    <div className="border-y border-line py-s4 text-xs font-mono uppercase tracking-widest">
      {children}
    </div>
  );
}
export function StudioTabs({ children }: React.PropsWithChildren) {
  return (
    <div className="relative z-20 flex gap-s1 rounded-full bg-paper p-s1 shadow-sm">
      {children}
    </div>
  );
}
