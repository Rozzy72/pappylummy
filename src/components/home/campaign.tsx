import type * as React from "react";

/** Campaign-specific composition; shared tokens remain the visual foundation. */
export function Campaign({ intro, media, children }: React.PropsWithChildren<{
  intro: React.ReactNode;
  media: React.ReactNode;
}>) {
  return (
    <section aria-labelledby="hero-heading" className="nk-campaign">
      <div className="nk-campaign-intro">{intro}</div>
      <figure className="nk-campaign-art">{media}</figure>
      <div className="nk-campaign-body">{children}</div>
    </section>
  );
}
export function CampaignHeading() {
  return (
    <h1 id="hero-heading" className="sd-type-display-xl uppercase">
      YOUR TEAM.<br />YOUR COLOURS.<br /><span>YOUR IDENTITY.</span>
    </h1>
  );
}
