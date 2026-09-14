import Image from "next/image";
import Link from "next/link";

const trustPoints = [
  "Nationwide delivery",
  "Secure checkout coming soon",
  "New kits added regularly",
];

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="grid items-center gap-10 py-4 sm:py-8 lg:grid-cols-2 lg:gap-16">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
          Football culture. Delivered nationwide.
        </p>
        <h1 id="hero-heading" className="mt-5 max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Rep Your Club.<br />Own Your Colours.
        </h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-neutral-600 sm:text-lg">
          Shop the latest club, international and retro football jerseys,
          delivered across Nigeria.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/shop" className="inline-flex min-h-12 items-center justify-center rounded-md bg-neutral-950 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-4">
            Shop Jerseys
          </Link>
          <Link href="/clubs" className="inline-flex min-h-12 items-center justify-center rounded-md border border-neutral-300 px-6 py-3 text-sm font-semibold hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-4">
            Explore Clubs
          </Link>
        </div>
        <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs leading-5 text-neutral-600">
          {trustPoints.map((point) => (
            <li key={point} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-1 rounded-full bg-neutral-500" />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div aria-hidden="true" className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 p-6 sm:p-8">
        <div className="relative z-10 flex justify-between gap-4 text-xs font-medium uppercase tracking-widest text-neutral-600">
          <span>The kit collection</span>
          <span>Naija Kits</span>
        </div>
        <Image
          src="/products/placeholder.svg"
          alt=""
          width={640}
          height={800}
          className="mx-auto h-auto w-full max-w-80 -rotate-6"
        />
        <div className="relative z-10 border-t border-neutral-300 pt-5">
          <p className="text-lg font-semibold tracking-tight">Your team. Your everyday.</p>
          <p className="mt-1 text-sm text-neutral-600">Club / Country / Classics</p>
        </div>
      </div>
    </section>
  );
}
