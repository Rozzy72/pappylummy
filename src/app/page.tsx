import { Hero } from "@/components/home/hero";
import { NewArrivals } from "@/components/home/new-arrivals";
import { StoreBenefits } from "@/components/home/store-benefits";

export default function HomePage() {
  return (
    <>
      <Hero />
      <NewArrivals />
      <StoreBenefits />
    </>
  );
}
