import { KitLab } from "@/components/customizer/kit-lab";
export const metadata = { title: "Personalise Your Jersey | PappyLummy" };
export default async function CustomizePage({
  searchParams,
}: {
  searchParams: Promise<{ jersey?: string | string[] }>;
}) {
  const { jersey } = await searchParams;
  return (
    <>
      <KitLab initialSlug={typeof jersey === "string" ? jersey : undefined} />
    </>
  );
}
