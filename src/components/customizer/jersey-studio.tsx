"use client";
import { useState } from "react";
import {
  Stack,
  Flex,
  Text,
  Heading,
  FieldLabel,
  Input,
  Select,
  Button,
  LinkButton,
  StudioLayout,
  StudioControls,
  StudioSelection,
  Disclosure,
  StudioGallery,
  StudioJerseyRail,
  LetteringStyle,
  StudioStage,
  StudioTabs,
  ImageFrame,
} from "@sd/ui";
import { ProductImage } from "@/components/product/product-image";
import { ProductLetteringPreview } from "./product-lettering-preview";
import { useCartHydration } from "@/components/cart/use-cart-hydration";
import { useCartStore } from "@/store/cart-store";
import { parsePersonalization, PERSONALIZATION_PRICE, jerseyUnitPrice } from "@/lib/personalization";
import { formatCurrency } from "@/utils/format-currency";
import type { Product, JerseySize } from "@/types/product";
export function JerseyStudio({
  products,
  initialSlug,
}: {
  products: Product[];
  initialSlug?: string;
}) {
  const available = products.filter((p) => p.inStock && p.sizes.length);
  const [slug, setSlug] = useState(
    initialSlug ??
      available.find((p) => p.country === "Nigeria")?.slug ??
      available[0]?.slug,
  );
  const product = available.find((p) => p.slug === slug) ?? available[0];
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [size, setSize] = useState<JerseySize | "">("");
  const [view, setView] = useState<"front" | "back">("back");
  const [message, setMessage] = useState("");
  const [font,setFont] = useState<"Classic"|"Modern"|"Bold">("Classic");
  const hydrated = useCartHydration();
  const addItem = useCartStore((s) => s.addItem);
  const print = parsePersonalization({ name, number });
  if (!product)
    return <Text>No jerseys are currently available to personalize.</Text>;
  function add() {
    if (!product || !size || !print) return;
    setMessage(
      addItem(product, size, 1, print)
        ? "Your personalized jersey is in your bag."
        : "Unable to add this jersey. The limit is 10 per jersey and size.",
    );
  }
  return (
    <StudioLayout
      preview={
        <Stack gap="4">
          <StudioGallery><StudioJerseyRail>{available.map(item=><Button key={item.id} variant={product.id===item.id?"solid":"surface"} aria-label={`Customise ${item.name}`} aria-pressed={product.id===item.id} onClick={()=>{setSlug(item.slug);setSize("");setView("back");setMessage("");}}><ImageFrame kind="thumb"><ProductImage reference={item.image} productId={item.id} alt={item.name} fill sizes="48px" /></ImageFrame></Button>)}</StudioJerseyRail><StudioStage>
            <StudioTabs>
              <Button
                variant={view === "back" ? "solid" : "link"}
                aria-pressed={view === "back"}
                onClick={() => setView("back")}
              >
                Lettering template
              </Button>
              <Button
                variant={view === "front" ? "solid" : "link"}
                aria-pressed={view === "front"}
                onClick={() => setView("front")}
              >
                Actual jersey
              </Button>
            </StudioTabs>
            {view === "back" ? (
              <LetteringStyle font={font}><ProductLetteringPreview
                product={product}
                name={name.trim().toUpperCase() || "YOUR NAME"}
                number={number || "10"}
              /></LetteringStyle>
            ) : (
              <ImageFrame kind="studio">
                <ProductImage
                  reference={product.image}
                  productId={product.id}
                  alt={product.name}
                  fill
                  sizes="(min-width:1024px) 50vw, 100vw"
                />
              </ImageFrame>
            )}
          </StudioStage></StudioGallery>
          {view==="front"&&<Text look="small" muted>Illustrative lettering preview. Choose Lettering template to preview your name and number.</Text>}
        </Stack>
      }
      controls={
        <StudioControls>
          <Stack gap="2">
            <Text look="eyebrow" muted>
              PERSONALISE YOUR JERSEY
            </Text>
            <Heading as="h1">Personalise Your Jersey</Heading>
            <Text muted>Add your name and number to make it uniquely yours.</Text>
          </Stack>

          <Stack gap="2">
            <FieldLabel htmlFor="kit-name">Name (max. 16 characters)</FieldLabel>
            <Input
              id="kit-name"
              value={name}
              maxLength={16}
              placeholder="e.g. ADEBAYO"
              autoComplete="off"
              aria-describedby="kit-name-help"
                  aria-invalid={name.length > 0 && !parsePersonalization({name,number:"1"})}
              onChange={(e) => {
                setName(e.target.value);
                setMessage("");
              }}
            />
            <Text id="kit-name-help" look="small" muted>
              Up to 16 characters. Letters, spaces, apostrophes, dots and
              hyphens.
            </Text>
          </Stack>
          <Stack gap="4">
            <Stack gap="2">
              <FieldLabel htmlFor="kit-number">Number</FieldLabel>
              <Input
                id="kit-number"
                inputMode="numeric"
                value={number}
                maxLength={2}
                placeholder="10"
                aria-describedby="kit-number-help"
                onChange={(e) => {
                  setNumber(e.target.value.replace(/[^0-9]/g, ""));
                  setMessage("");
                }}
              />
              <Text id="kit-number-help" look="small" muted>
                One or two digits (0–99).
              </Text>
            </Stack>

          </Stack>
          <StudioSelection>          <Stack gap="2">
            <FieldLabel htmlFor="kit-jersey">Choose your jersey</FieldLabel>
            <Select
              id="kit-jersey"
              value={product.slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setView("back");
                setSize("");
                setMessage("");
              }}
            >
              {available.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Stack>            <Stack gap="2">
              <FieldLabel htmlFor="kit-size">Jersey size</FieldLabel>
              <Select
                id="kit-size"
                value={size}
                onChange={(e) => {
                  setSize(e.target.value as JerseySize);
                  setMessage("");
                }}
              >
                <option value="">Choose size</option>
                {product.sizes.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Stack></StudioSelection>
          <fieldset><legend>Font Style (preview only)</legend><Flex gap="2">{(["Classic","Modern","Bold"] as const).map(style=><Button key={style} variant={font===style?"solid":"surface"} aria-pressed={font===style} onClick={()=>{setFont(style);setView("back");}}>{style}</Button>)}</Flex></fieldset>
          <Disclosure title="Price details"><Flex justify="between" wrap>
            <Text muted>Base jersey price</Text>
            <Text look="price">{formatCurrency(product.price)}</Text>
          </Flex>
          <Flex justify="between" wrap><Text muted>Name + number printing</Text><Text>{formatCurrency(PERSONALIZATION_PRICE)}</Text></Flex></Disclosure>
          <Flex justify="between" wrap><Text>Personalized jersey total</Text><Text look="price">{formatCurrency(jerseyUnitPrice(product.price, true))}</Text></Flex>
          <Text look="small" muted>
            Printing is charged per jersey. Delivery is not included. Save your selection in your bag; checkout is not yet available.
          </Text>
          <Button
            fullWidth
            disabled={!hydrated || !size || !print}
            onClick={add}
          >
            Add to Cart
          </Button>
          <Text role="status" aria-live="polite">
            {message}
          </Text>
          {message.startsWith("Your") && (
            <LinkButton href="/cart" variant="link">
              View your bag →
            </LinkButton>
          )}
        </StudioControls>
      }
    />
  );
}
