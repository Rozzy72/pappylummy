"use client";

export default function StorefrontError({ reset }: { reset: () => void }) {
  return (
    <section role="alert" className="py-16 text-center">
      <h1 className="text-2xl font-semibold">We couldn’t load this page.</h1>
      <p className="mt-3 text-neutral-600">Please try again in a moment.</p>
      <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-md bg-neutral-950 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4">
        Try again
      </button>
    </section>
  );
}
