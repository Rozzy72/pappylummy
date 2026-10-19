import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Space, Variant, Size, Radius, TypeRole } from "./scales";
export * from "./scales";
const gapMap = {
  "0": "gap-s0",
  "1": "gap-s1",
  "2": "gap-s2",
  "3": "gap-s3",
  "4": "gap-s4",
  "5": "gap-s5",
  "6": "gap-s6",
  "7": "gap-s7",
  "8": "gap-s8",
  "9": "gap-s9",
  "10": "gap-s10",
  "11": "gap-s11",
};
const pMap = {
  "0": "p-s0",
  "1": "p-s1",
  "2": "p-s2",
  "3": "p-s3",
  "4": "p-s4",
  "5": "p-s5",
  "6": "p-s6",
  "7": "p-s7",
  "8": "p-s8",
  "9": "p-s9",
  "10": "p-s10",
  "11": "p-s11",
};
const pxMap = {
  "0": "px-s0",
  "1": "px-s1",
  "2": "px-s2",
  "3": "px-s3",
  "4": "px-s4",
  "5": "px-s5",
  "6": "px-s6",
  "7": "px-s7",
  "8": "px-s8",
  "9": "px-s9",
  "10": "px-s10",
  "11": "px-s11",
};
const pyMap = {
  "0": "py-s0",
  "1": "py-s1",
  "2": "py-s2",
  "3": "py-s3",
  "4": "py-s4",
  "5": "py-s5",
  "6": "py-s6",
  "7": "py-s7",
  "8": "py-s8",
  "9": "py-s9",
  "10": "py-s10",
  "11": "py-s11",
};
const mMap = {
  "0": "m-s0",
  "1": "m-s1",
  "2": "m-s2",
  "3": "m-s3",
  "4": "m-s4",
  "5": "m-s5",
  "6": "m-s6",
  "7": "m-s7",
  "8": "m-s8",
  "9": "m-s9",
  "10": "m-s10",
  "11": "m-s11",
};
const join = (...values: (string | false | undefined)[]) =>
  values.filter(Boolean).join(" ");
type Clean<T> = Omit<T, "className" | "style" | "color">;
type SpaceProps = { gap?: Space; p?: Space; px?: Space; py?: Space; m?: Space };
const space = ({ gap, p, px, py, m }: SpaceProps) =>
  join(
    gap && gapMap[gap],
    p && pMap[p],
    px && pxMap[px],
    py && pyMap[py],
    m && mMap[m],
  );
const surfaces = {
  plain: "",
  paper: "bg-paper text-ink",
  muted: "bg-material text-ink",
  brand: "bg-brand text-onbrand",
  accent: "bg-accent text-ink",
};
const widths = {
  full: "w-full",
  container: "sd-container",
  prose: "max-w-xl",
  narrow: "mx-auto w-full max-w-xl",
};
type BoxProps = Clean<React.HTMLAttributes<HTMLElement>> &
  SpaceProps & {
    as?:
      | "div"
      | "section"
      | "article"
      | "header"
      | "footer"
      | "aside"
      | "nav"
      | "main"
      | "ul"
      | "li";
    surface?: keyof typeof surfaces;
    width?: keyof typeof widths;
    alignText?: "left" | "center";
    border?: boolean;
    radius?: Radius;
    grow?: boolean;
    visibility?: "desktop" | "mobile";
  };
export function Box({
  as: Tag = "div",
  surface = "plain",
  width,
  alignText = "left",
  border,
  radius = "none",
  grow,
  visibility,
  gap,
  p,
  px,
  py,
  m,
  ...props
}: BoxProps) {
  return (
    <Tag
      className={join(
        "min-w-0 break-words",
        space({ gap, p, px, py, m }),
        surfaces[surface],
        alignText === "center" && "text-center",
        width && widths[width],
        border && "border border-line",
        radii[radius],
        grow && "flex-1",
        visibility === "desktop" && "hidden lg:block",
        visibility === "mobile" && "lg:hidden",
      )}
      {...props}
      data-surface={surface === "brand" ? "inverse" : surface}
    />
  );
}
export function Stack({ gap = "4", ...props }: BoxProps) {
  return <Box {...props} gap={gap} data-stack="" />;
}
export function Flex({
  gap = "4",
  align = "center",
  justify = "start",
  wrap = false,
  children,
  ...props
}: Clean<React.HTMLAttributes<HTMLDivElement>> & {
  gap?: Space;
  align?: "start" | "center" | "end";
  justify?: "start" | "between" | "end";
  wrap?: boolean;
}) {
  return (
    <div
      className={join(
        "flex min-w-0",
        gapMap[gap],
        { start: "items-start", center: "items-center", end: "items-end" }[
          align
        ],
        {
          start: "justify-start",
          between: "justify-between",
          end: "justify-end",
        }[justify],
        wrap && "flex-wrap",
      )}
      {...props}
    >
      {children}
    </div>
  );
}
export function Grid({
  layout = "products",
  children,
  ...props
}: Clean<React.HTMLAttributes<HTMLDivElement>> & {
  layout?: "products" | "split" | "three" | "filters";
}) {
  return (
    <div
      className={join(
        "grid min-w-0 gap-s6",
        {
          products: "grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
          split: "lg:grid-cols-2 lg:gap-s9",
          three: "md:grid-cols-3",
          filters: "sm:grid-cols-2 lg:grid-cols-4",
        }[layout],
      )}
      {...props}
    >
      {children}
    </div>
  );
}
const textLooks = {
  body: "sd-type-body",
  "body-small": "sd-type-body-small",
  meta: "sd-type-meta",
  small: "sd-type-body-small",
  eyebrow: "font-mono text-xs font-medium uppercase tracking-widest",
  lead: "text-base leading-8 sm:text-lg",
  price: "text-xl font-semibold tracking-tight",
  card: "text-sm font-semibold leading-6",
};
export function Text({
  as: Tag = "p",
  look = "body",
  measure = false,
  muted = false,
  children,
  ...props
}: Clean<React.HTMLAttributes<HTMLElement>> & {
  as?: "p" | "span" | "div";
  look?: keyof typeof textLooks;
  muted?: boolean;
  measure?: boolean;
}) {
  return (
    <Tag className={join(textLooks[look], measure && "sd-measure-body", muted && "sd-text-muted")} {...props}>
      {children}
    </Tag>
  );
}
/** Semantic level and visual role are independent. */
const typeLooks: Record<TypeRole, string> = {
 "display-xl": "sd-type-display-xl", "display-lg": "sd-type-display-lg",
 "heading-lg": "sd-type-heading-lg", heading: "sd-type-heading", body: "sd-type-body",
 "body-small": "sd-type-body-small", meta: "sd-type-meta",
};
export function Heading({ as: Tag = "h2", look = "heading", display = false, measure = false, ...props }:
 Clean<React.HTMLAttributes<HTMLHeadingElement>> & {
 as?: "h1" | "h2" | "h3" | "h4"; look?: TypeRole;
 /** @deprecated Use look="display-xl". */
 display?: boolean; measure?: boolean;
}) {
 return <Tag className={join(typeLooks[display ? "display-xl" : look], "text-balance", measure && "sd-measure-heading")} {...props} />;
}
const buttonLooks: Record<Variant, string> = {
 primary: "bg-brand text-onbrand hover:bg-brand-hover",
 secondary: "border border-strong bg-paper text-ink hover:bg-material",
 text: "underline underline-offset-4 decoration-1 hover:decoration-2",
  solid: "bg-brand text-onbrand hover:bg-brand-hover",
  soft: "bg-accent text-ink hover:bg-accent-hover",
  surface: "bg-paper text-ink border border-strong hover:bg-material",
  outline: "border border-current hover:bg-material hover:text-ink",
  ghost: "hover:bg-material hover:text-ink",
  link: "underline underline-offset-4 hover:opacity-70",
};
const sizes: Record<Size, string> = {
  "1": "min-h-11 px-s3 text-xs",
  "2": "min-h-11 px-s4 text-sm",
  "3": "min-h-12 px-s6 text-sm",
  "4": "min-h-14 px-s8 text-base",
};
const radii: Record<Radius, string> = {
  none: "rounded-none",
  sm: "rounded-sdsm",
  md: "rounded-sdmd",
  lg: "rounded-sdlg",
  full: "rounded-full",
};
type ActionProps = {
  variant?: Variant;
  size?: Size;
  radius?: Radius;
  fullWidth?: boolean;
};
function action({
  variant = "primary",
  size = "2",
  radius = "sm",
  fullWidth,
}: ActionProps) {
  return join(
    "inline-flex items-center justify-center gap-s2 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
    buttonLooks[variant],
    sizes[size],
    radii[radius],
    fullWidth && "w-full",
  );
}
export function Button({
  variant,
  size,
  radius,
  fullWidth,
  loading = false,
  ref,
  ...props
}: Clean<React.ButtonHTMLAttributes<HTMLButtonElement>> &
  ActionProps & { loading?: boolean; ref?: React.Ref<HTMLButtonElement> }) {
  return (
    <button
      type="button"
      ref={ref}
      className={action({ variant, size, radius, fullWidth })}
      {...props}
      disabled={props.disabled || loading}
    />
  );
}
export function LinkButton({
  variant,
  size,
  radius,
  fullWidth,
  ...props
}: Clean<React.ComponentProps<typeof Link>> & ActionProps) {
  return (
    <Link className={action({ variant, size, radius, fullWidth })} {...props} />
  );
}
export function NavLink({ emphasis = false, ...props }: Clean<React.ComponentProps<typeof Link>> & { emphasis?: boolean }) {
  return (
    <Link
      className={join("inline-flex min-h-11 items-center text-sm font-medium hover:underline underline-offset-8", emphasis && "decoration-accent decoration-2 underline")}
      {...props}
    />
  );
}
export function IconButton({ "aria-label": label, variant = "ghost", ...props }:
 Omit<Clean<React.ButtonHTMLAttributes<HTMLButtonElement>>, "aria-label"> & {
 "aria-label": string; variant?: "primary" | "secondary" | "ghost"; ref?: React.Ref<HTMLButtonElement>;
}) {
 if (!label.trim()) throw new Error("IconButton requires an accessible label");
 return <button type="button" className={join("inline-flex size-11 shrink-0 items-center justify-center rounded-sdsm disabled:opacity-40 disabled:cursor-not-allowed", buttonLooks[variant])} {...props} aria-label={label} />;
}
export function Badge({ children, variant = "neutral" }: React.PropsWithChildren<{ variant?: "new" | "sale" | "neutral" }>) {
 return <span className={join("inline-flex px-s2 py-s1 font-mono text-xs font-medium uppercase", {
 new: "bg-accent text-ink", sale: "bg-brand text-onbrand", neutral: "bg-material text-ink",
 }[variant])}>{children}</span>;
}
export function FieldLabel(
  { nowrap = false, ...props }: Clean<React.LabelHTMLAttributes<HTMLLabelElement>> & { nowrap?: boolean },
) {
  return (
    <label
      className={join("block text-xs font-semibold uppercase tracking-wide", nowrap && "whitespace-nowrap shrink-0")}
      {...props}
    />
  );
}
export function Select(
  props: Clean<React.SelectHTMLAttributes<HTMLSelectElement>>,
) {
  return (
    <select
      className="min-h-12 w-full min-w-0 rounded-sdsm border border-strong bg-paper px-s3 text-sm text-ink"
      {...props}
    />
  );
}
export function Disclosure({
  title,
  children,
  open,
}: React.PropsWithChildren<{ title: string; open?: boolean }>) {
  return (
    <details open={open} className="group border-y border-line py-s4">
      <summary className="cursor-pointer min-h-11 flex items-center justify-between font-medium text-sm list-none">
        {title}
        <span aria-hidden="true" className="group-open:hidden">＋</span>
        <span aria-hidden="true" className="hidden group-open:inline">−</span>
      </summary>
      <div className="pt-s4">{children}</div>
    </details>
  );
}
export function ImageFrame({
  children,
  kind = "product",
}: React.PropsWithChildren<{
  kind?: "product" | "lifestyle" | "portrait" | "thumbnail" | "card" | "hero" | "detail" | "thumb" | "studio";
}>) {
  return (
    <div
      className={join(
        "sd-media relative overflow-hidden bg-media [&_img]:h-full [&_img]:w-full",
        {
          product: "aspect-portrait [&_img]:object-contain [&_img]:p-s3",
          lifestyle: "aspect-video [&_img]:h-full [&_img]:w-full [&_img]:object-cover",
          portrait: "aspect-portrait [&_img]:h-full [&_img]:w-full [&_img]:object-cover",
          thumbnail: "aspect-square w-24 shrink-0 [&_img]:object-contain",
          card: "aspect-square [&_img]:object-contain [&_img]:p-s3 motion-safe:[&_img]:transition-transform motion-safe:hover:[&_img]:scale-105",
          hero: "[&_img]:object-contain aspect-square lg:aspect-auto lg:min-h-96 [&_img]:p-s6",
          detail: "[&_img]:object-contain aspect-square [&_img]:p-s6",
          thumb: "[&_img]:object-contain aspect-square w-24 shrink-0",
          studio: "[&_img]:object-contain aspect-square w-full max-w-lg [&_img]:p-s3",
        }[kind],
      )}
    >
      {children}
    </div>
  );
}
export function Card({ children }: React.PropsWithChildren) {
  return (
    <article className="sd-product-card group flex h-full min-w-0 flex-col gap-s3">
      {children}
    </article>
  );
}
export function CardOverlay({
  children,
  side = "left",
}: React.PropsWithChildren<{ side?: "left" | "right" }>) {
  return (
    <div
      className={join(
        "absolute top-3 z-10 flex flex-col gap-s1",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      {children}
    </div>
  );
}
export function Wordmark() {
  return (
    <Link
      href="/"
      aria-label="PappyLummy home"
      className="inline-flex items-center gap-s2 font-black text-xl tracking-tighter"
    >
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center bg-accent text-ink rounded-sdsm text-sm"
      ><Icon name="shirt" /></span>
      PappyLummy
    </Link>
  );
}
export function SiteHeader({ children }: React.PropsWithChildren) {
  return (
    <header className="sd-site-header relative z-20 border-b border-line bg-canvas">
      {children}
    </header>
  );
}
export function Main({ children }: React.PropsWithChildren) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="sd-main"
    >
      {children}
    </main>
  );
}
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:p-s4"
    >
      Skip to content
    </a>
  );
}
export function SiteBody({ children }: React.PropsWithChildren) {
  return (
    <body className="flex min-h-dvh flex-col antialiased">{children}</body>
  );
}
export function MobilePanel(props: Clean<React.HTMLAttributes<HTMLElement>>) {
  return (
    <nav
      className="absolute inset-x-0 top-full border-b border-line bg-canvas p-s6 shadow-lg"
      {...props}
    />
  );
}
export function Icon({
  name,
}: {
  name: "heart" | "bag" | "arrow" | "menu" | "close" | "search" | "user" | "shirt" | "shield" | "truck" | "card" | "returns";
}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={
          {
            search: "M17 10a7 7 0 1 0-14 0 7 7 0 0 0 14 0Zm-2 5 6 6",
              user: "M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M4 21v-2a8 8 0 0 1 16 0v2",
              shirt: "m8 3-5 3-2 5 5 2 1-3v12h10V10l1 3 5-2-2-5-5-3a4 4 0 0 1-8 0Z",
              shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-4 10 3 3 5-6",
              truck: "M2 5h13v13H2ZM15 10h4l3 4v4h-7M8 19a2 2 0 1 0-4 0 2 2 0 0 0 4 0m12 0a2 2 0 1 0-4 0 2 2 0 0 0 4 0",
              card: "M2 4h20v16H2ZM2 9h20M6 15h4",
              returns: "M3 11a9 9 0 0 1 16-6l2 3M21 3v5h-5M21 13a9 9 0 0 1-16 6l-2-3M3 21v-5h5",
              heart:
              "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
            bag: "M5 7h14l1 14H4L5 7Zm3 0V6a4 4 0 0 1 8 0v1",
            arrow: "M4 12h16m-6-6 6 6-6 6",
            menu: "M4 7h16M4 17h16",
            close: "m6 6 12 12M6 18 18 6",
          }[name]
        }
      />
    </svg>
  );
}

export function Input(
  props: Clean<React.InputHTMLAttributes<HTMLInputElement>> & {
    ref?: React.Ref<HTMLInputElement>;
  },
) {
  return (
    <input
      className="min-h-12 w-full rounded-sdsm border border-strong bg-paper px-s3 text-ink"
      {...props}
    />
  );
}
export function Form(props: Clean<React.FormHTMLAttributes<HTMLFormElement>>) {
  return <form className="flex flex-col gap-s5" {...props} />;
}
export function Alert({
  children,
  ...props
}: Clean<React.HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className="border-l-4 border-brand bg-material p-s4 text-ink"
      {...props}
    >
      {children}
    </div>
  );
}

export function Feedback({
  emphasized = false,
  ...props
}: Clean<React.HTMLAttributes<HTMLParagraphElement>> & {
  emphasized?: boolean;
}) {
  return (
    <p
      className={
        emphasized
          ? "border-l-4 border-brand bg-material p-s4 font-medium text-ink"
          : "text-sm text-muted"
      }
      {...props}
    />
  );
}

export * from "./jersey";

/** Auth shares storefront surfaces; no separate colour or action system. */
export function AuthBackdrop({ children }: React.PropsWithChildren) {
 return <div data-surface="paper" className="mx-auto w-full max-w-2xl border border-line bg-paper p-s6 text-ink sm:p-s9">{children}</div>;
}
export function PasswordField({ children }: React.PropsWithChildren) {
  return <div className="relative [&_input]:pr-s9">{children}</div>;
}
export function PasswordToggle(
  props: Clean<React.ButtonHTMLAttributes<HTMLButtonElement>>,
) {
  return (
    <button
      className="absolute right-2 top-1/2 -translate-y-1/2 min-h-11 min-w-11 px-s2 text-xs font-semibold text-ink"
      type="button"
      {...props}
    />
  );
}

export function ProductLayout({ children }: React.PropsWithChildren) {
  return (
    <div className="sd-product-layout grid items-start gap-s8 lg:grid-cols-2 lg:gap-s9">
      {children}
    </div>
  );
}
export function ProductGalleryPanel({ children }: React.PropsWithChildren) {
  return (
    <div className="pl-product-gallery-panel min-w-0 lg:sticky lg:top-6">
      {children}
    </div>
  );
}
export function PersonalizationCard({ children }: React.PropsWithChildren) {
  return (
    <aside className="pl-personalization-card rounded-sdmd border border-line bg-material p-s4">
      {children}
    </aside>
  );
}
export function ProductOptions({ children }: React.PropsWithChildren) {
  return (
    <div className="pl-product-options">
      {children}
    </div>
  );
}

/** Opt-in shell: ordinary routes retain Main's contained layout. */
export function PageFrame({ children, width = "contained" }: React.PropsWithChildren<{ width?: "contained" | "full-bleed" }>) {
 return <div data-page-width={width}>{children}</div>;
}
export function PageContainer({ children }: React.PropsWithChildren) {
 return <div className="sd-container">{children}</div>;
}
export function Section({ children, width = "contained", tone = "default", spacing = "standard", ...props }:
 Clean<React.HTMLAttributes<HTMLElement>> & {
 width?: "contained" | "full-bleed"; tone?: "default" | "muted" | "inverse";
 spacing?: "compact" | "standard" | "editorial";
}) {
 return <section {...props} data-surface={tone} className={join(width === "contained" && "sd-container", {
 default: "bg-canvas text-ink", muted: "bg-material text-ink", inverse: "bg-inverse text-oninverse",
 }[tone], { compact: "py-s6", standard: "sd-section-space", editorial: "sd-editorial-space" }[spacing])}>{children}</section>;
}
export function SectionHeader({ eyebrow, title, description, action: link, id }:
 { eyebrow?: string; title: string; description?: string; action?: React.ReactNode; id?: string }) {
 return <Flex justify="between" align="end" wrap><Stack gap="3">
 {eyebrow && <Text look="eyebrow" muted>{eyebrow}</Text>}
 <Heading id={id} look="heading-lg">{title}</Heading>
 {description && <Text muted measure>{description}</Text>}
 </Stack>{link}</Flex>;
}
export function EmptyState({ title, description, action: link }: { title: string; description?: string; action?: React.ReactNode }) {
 return <Stack py="9" gap="4"><Heading>{title}</Heading>{description && <Text muted measure>{description}</Text>}{link && <div>{link}</div>}</Stack>;
}
/** Caller uses the existing currency formatter; presentation does no calculations. */
export function Price({ current, original }: { current: string; original?: string }) {
 return <Flex gap="2" wrap><Text look="price"><span className="sr-only">Current price: </span>{current}</Text>
 {original && <Text look="small" muted><span className="sr-only">Original price: </span><del>{original}</del></Text>}</Flex>;
}
/** Callers choose live-region semantics when feedback changes. */
export function Notice({ tone = "info", ...props }: Clean<React.HTMLAttributes<HTMLDivElement>> & { tone?: "success" | "warning" | "danger" | "info" }) {
 return <div {...props} data-surface="paper" className="sd-notice border-l-4 bg-paper p-s4" data-notice={tone} />;
}

/** Closed storefront compositions keep appearance in the shared UI package. */
export function HeaderLayout({brand,navigation,tools}: {brand:React.ReactNode;navigation:React.ReactNode;tools:React.ReactNode}) {
 return <div className="sd-container pl-header-layout"><div className="pl-header-brand">{brand}</div><div className="pl-header-navigation">{navigation}</div><div className="pl-header-tools">{tools}</div></div>;
}
export function StudioControls({children}:React.PropsWithChildren){return <div className="pl-studio-controls">{children}</div>;}
export function LetteringStyle({font,children}:React.PropsWithChildren<{font:"Classic"|"Modern"|"Bold"}>){return <div className="pl-lettering-style" data-font={font}>{children}</div>;}

export function MobileStoreNav({children}:React.PropsWithChildren){
 const glyphs=["M3 10 12 3l9 7v11h-7v-7h-4v7H3Z","m8 3-5 3-2 5 5 2 1-3v12h10V10l1 3 5-2-2-5-5-3a4 4 0 0 1-8 0Z","M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 4 0 8 8 15 8-7 12-11 8-15Z","M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M4 21v-2a8 8 0 0 1 16 0v2Z","M5 7h14l1 14H4L5 7Zm3 0V6a4 4 0 0 1 8 0v1"];
 return <nav className="pl-mobile-store-nav" aria-label="Quick shopping navigation">{React.Children.map(children,(child,i)=><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={glyphs[i]}/></svg>{child}</span>)}</nav>;
}

export function StudioGallery({children}:React.PropsWithChildren){return <div className="pl-studio-gallery">{children}</div>;}
export function StudioJerseyRail({children}:React.PropsWithChildren){return <div className="pl-studio-rail" role="group" aria-label="Choose a jersey">{children}</div>;}

/** Decorative excerpts from the owner's approved design board, never catalogue images. */
export function ReferenceArtwork({region}:{region:"hero"|"Arsenal"|"Chelsea"|"Manchester United"|"Liverpool"|"Real Madrid"|"Barcelona"|"Manchester City"|"Bayern Munich"|"Club Jerseys"|"National Teams"|"Retro Jerseys"|"Custom Jerseys"|"back"}) {
 const regions:Record<string,number[]>={hero:[322,70,306,251],Arsenal:[46,418,32,39],Chelsea:[121,418,34,39],"Manchester United":[193,417,40,40],Liverpool:[272,417,35,42],"Real Madrid":[348,417,35,42],Barcelona:[424,418,36,39],"Manchester City":[498,418,37,40],"Bayern Munich":[571,421,25,31],"Club Jerseys":[32,540,134,82],"National Teams":[179,540,133,82],"Retro Jerseys":[324,540,134,82],"Custom Jerseys":[470,540,134,82],back:[685,734,134,152]};
 const [x,y,w,h]=regions[region];const id="reference-"+region.replaceAll(" ","-");
 return <svg className="pl-reference-art" viewBox={[x,y,w,h].join(" ")} preserveAspectRatio={region==="hero"||region.includes("Jerseys")||region==="National Teams"?"xMidYMid slice":"xMidYMid meet"} aria-hidden="true"><defs><clipPath id={id}><rect x={x} y={y} width={w} height={h}/></clipPath></defs><image href="/reference/design-board.png" width="1536" height="1024" clipPath={"url(#"+id+")"}/></svg>;
}
export function MatchdayFeatures(){return <div className="pl-matchday-features">{[["Choose your fit","Available sizes on each jersey"],["Made for matchday","Club and country collections"],["Prices in naira","Browse the live catalogue"],["Make it yours","Name and number options"]].map(([title,copy],i)=><div key={title}><Icon name={i===0?"shield":i===1?"truck":i===2?"card":"returns"}/><div><strong>{title}</strong><span>{copy}</span></div></div>)}</div>;}

export function StoreIconLink({href,label,icon,count}:{href:string;label:string;icon:"search"|"user"|"bag"|"heart";count?:number}){return <Link href={href} aria-label={label} className="pl-store-icon-link"><Icon name={icon}/>{count!==undefined&&count>0&&<span aria-hidden="true">{count}</span>}</Link>;}
export function CardShopping({children}:React.PropsWithChildren){return <div className="pl-card-shopping">{children}</div>;}
export function GalleryLayout({rail,children}:React.PropsWithChildren<{rail:React.ReactNode}>){return <div className="pl-gallery-layout"><div className="pl-gallery-rail">{rail}</div><div className="pl-gallery-main">{children}</div></div>;}
export function CartLayout({children}:React.PropsWithChildren){return <div className="pl-cart-layout">{children}</div>;}
export function CartLinePanel({children}:React.PropsWithChildren){return <li className="pl-cart-line">{children}</li>;}
export function CustomiseSteps(){return <ul className="pl-customise-steps">{["Choose your jersey","Add name & number","Preview your design","Save to your bag"].map((step,i)=><li key={step}><Icon name={i===0?"shirt":i===3?"bag":"user"}/>{step}</li>)}</ul>;}
export function MobileCategories(){return <nav className="pl-mobile-categories" aria-label="Jersey collections">{[["/clubs","Clubs"],["/shop?teamType=national","National Teams"],["/customize","Customise"],["/#new-arrivals","New Arrivals"]].map(([href,label])=><Link key={href} href={href}><span><Icon name="shirt"/></span>{label}</Link>)}</nav>;}

export function MarketingArtwork({kind}:{kind:"club"|"national"|"retro"|"custom"|"banner"}){return <Image className="pl-marketing-art" data-art={kind} src={"/campaigns/pappylummy-"+kind+"-v2.png"} alt="" width={kind==="banner"?2164:1024} height={kind==="banner"?727:1280} sizes={kind==="banner"?"100vw":"(min-width:768px) 25vw, 50vw"}/>;}

export function PersonalizationFields({children}:React.PropsWithChildren){return <div className="pl-personalization-fields">{children}</div>;}
export function SwitchLabel({children,...props}:Clean<React.LabelHTMLAttributes<HTMLLabelElement>>){return <label className="pl-switch-label" {...props}>{children}</label>;}

export function StudioSelection({children}:React.PropsWithChildren){return <div className="pl-studio-selection">{children}</div>;}
export function CartPage({children}:React.PropsWithChildren){return <div className="pl-cart-page">{children}</div>;}

/** Generated illustrations are deliberately separate from validated catalogue photos. */
const letteringArtwork={"arsenal-home":"/illustrations/backs/arsenal-home-v1.png","barcelona-home":"/illustrations/backs/barcelona-home-v1.png","bayern-munich-home":"/illustrations/backs/bayern-munich-home-v1.png","brazil-international":"/illustrations/backs/brazil-international-v1.png","chelsea-away":"/illustrations/backs/chelsea-away-v1.png","liverpool-home":"/illustrations/backs/liverpool-home-v1.png","manchester-city-third":"/illustrations/backs/manchester-city-third-v1.png","manchester-united-home":"/illustrations/backs/manchester-united-home-v1.png","nigeria-retro":"/illustrations/backs/nigeria-retro-v1.png","real-madrid-player":"/illustrations/backs/real-madrid-player-v1.png","nigeria-home":"/illustrations/backs/nigeria-home-v1.png"} as const;
export type LetteringArtwork=keyof typeof letteringArtwork;
export function hasLetteringArtwork(slug:string):slug is LetteringArtwork{return Object.hasOwn(letteringArtwork,slug);}
export function JerseyPhotoPreview({jersey,name,number}:{jersey:LetteringArtwork;name:string;number:string}){
 const light=jersey==="real-madrid-player"||jersey==="chelsea-away"||jersey==="brazil-international"||jersey==="nigeria-retro";
 return <svg className="pl-photographic-jersey" viewBox="0 0 1024 1280" role="img" aria-label={"Illustrative back jersey preview: "+name+", number "+number}><image href={letteringArtwork[jersey]} width="1024" height="1280" preserveAspectRatio="xMidYMid meet"/><g fill={light?"var(--sd-kit-ink)":"var(--sd-kit-print)"} textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800"><text x="512" y="378" fontSize="48" letterSpacing="2" textLength={name.length>=10?500:undefined} lengthAdjust="spacingAndGlyphs">{name.toUpperCase()}</text><text x="512" y="660" fontSize="190" fontWeight="900" stroke={light?"var(--sd-kit-print)":"var(--sd-kit-seam)"} strokeWidth="2" paintOrder="stroke fill">{number}</text></g></svg>;
}


export function PurchaseActions({children}:React.PropsWithChildren){return <div className="pl-purchase-actions">{children}</div>;}
