"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Stack, Text, Button } from "@sd/ui";
export function CatalogueRetry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Stack role="status" p="4" border>
      <Text>
        We could not load current product details. Your saved selections are
        preserved.
      </Text>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {pending ? "Retrying…" : "Retry product details"}
      </Button>
    </Stack>
  );
}
