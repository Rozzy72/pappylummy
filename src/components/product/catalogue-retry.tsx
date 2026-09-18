"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function CatalogueRetry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div role="status" className="my-6 rounded-md border border-neutral-300 p-4">
      <p>We could not load current product details. Your saved selections are preserved.</p>
      <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}
        className="mt-3 min-h-11 rounded-md border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">
        {pending ? "Retrying…" : "Retry product details"}
      </button>
    </div>
  );
}
