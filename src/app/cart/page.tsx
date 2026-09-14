import { CartContents } from "@/components/cart/cart-contents";

export default function CartPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your Cart</h1>
      <CartContents />
    </>
  );
}
