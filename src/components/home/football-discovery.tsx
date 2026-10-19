import Link from "next/link";
import { MarketingArtwork, ReferenceArtwork, Heading, Icon, ImageFrame, LinkButton, PageContainer, Section, SectionHeader, Stack, Text } from "@sd/ui";
import { ProductImage } from "@/components/product/product-image";
import { getProducts } from "@/lib/products/queries";
import { getTeam } from "@/utils/product-catalogue";
import type { Product } from "@/types/product";

// Editorial ordering only. Every tile, image and destination requires a catalogue match.
const featuredTeams = ["Nigeria", "Arsenal", "Chelsea", "Barcelona", "Real Madrid"] as const;
export function selectTeamFeatures(products: readonly Product[]) {
  return featuredTeams.flatMap((team) => {
    const matches = products.filter((product) => getTeam(product) === team);
    const product = matches.find((item) => item.category === (team === "Nigeria" ? "retro" : "home")) ?? matches[0];
    return product ? [{ team, product, href: `/shop?club=${encodeURIComponent(team)}` }] : [];
  });
}

export function ShopByTeam({ products }: { products: readonly Product[] }) {
  const features: { team: string; product: Product; href: string }[] = selectTeamFeatures(products).filter(({ product }) => Boolean(product.club));
  const teams = new Set(features.map(({ team }) => team));
  for (const product of products) {
    const team = getTeam(product);
    if (product.club && !teams.has(team)) { features.push({ team, product, href: `/shop?club=${encodeURIComponent(team)}` }); teams.add(team); }
  }
  const order=["Arsenal","Chelsea","Manchester United","Liverpool","Real Madrid","Barcelona","Manchester City","Bayern Munich"];
  features.sort((a,b)=>(order.indexOf(a.team)<0?99:order.indexOf(a.team))-(order.indexOf(b.team)<0?99:order.indexOf(b.team)));
  if (!features.length) return null;
  return (
    <Section id="shop-by-team" spacing="editorial" aria-labelledby="teams-heading">
      <Stack gap="8">
        <SectionHeader id="teams-heading" description="Find your favourite club and wear the badge." title="Shop by Club" action={<LinkButton href="/clubs" variant="text">View all clubs <Icon name="arrow" /></LinkButton>} />
        <div className="nk-team-mosaic">
          {features.slice(0, 8).map(({ team, product, href }) => (
            <Link key={team} href={href} className="nk-team-tile" data-featured={team === "Nigeria" ? "true" : undefined} aria-label={`Shop ${team} jerseys`}>
              {["Arsenal","Chelsea","Manchester United","Liverpool","Real Madrid","Barcelona","Manchester City","Bayern Munich"].includes(team) ? <ReferenceArtwork region={team as "Arsenal"} /> : <ImageFrame kind="product"><ProductImage reference={product.image} productId={product.id} alt={product.name} fill loading="lazy" sizes="80px" /></ImageFrame>}
              <div className="nk-team-caption">
                <div>
                  <Text look="meta" muted>{product.club ? "Club collection" : "National team"}</Text>
                  <Heading as="h3" look="heading">{team}</Heading>
                </div>
                <Icon name="arrow" />
              </div>
            </Link>
          ))}
        </div>
      </Stack>
    </Section>
  );
}

export function NigeriaEditorial({ products }: { products: readonly Product[] }) {
  const nigeria = products.filter((product) => getTeam(product) === "Nigeria");
  const product = nigeria.find((item) => item.category === "home") ?? nigeria[0];
  if (!product) return null;
  return (
    <Section id="naija-football" width="full-bleed" tone="inverse" spacing="editorial" aria-labelledby="nigeria-heading">
      <PageContainer>
        <div className="nk-nigeria-editorial">
          <div className="nk-nigeria-copy">
            <Text look="eyebrow">03 / NAIJA FOOTBALL</Text>
            <h2 id="nigeria-heading" className="sd-type-display-xl nk-nigeria-title">WEAR<br />THE <span>GREEN.</span></h2>
            <Text measure>Nigeria colours. Your own expression. Explore jerseys for match day and every day.</Text>
            <div><LinkButton href="/shop?club=Nigeria" variant="secondary" size="3">Shop Nigeria <Icon name="arrow" /></LinkButton></div>
          </div>
          <figure className="nk-nigeria-product">
            <ImageFrame kind="product">
              <ProductImage reference={product.image} productId={product.id} alt={product.name} fill loading="lazy"
                sizes="(min-width:1536px) 580px, (min-width:768px) 42vw, 100vw" />
            </ImageFrame>
            <figcaption><Text as="span" look="small">{product.name}</Text></figcaption>
          </figure>
        </div>
      </PageContainer>
    </Section>
  );
}

export async function FootballDiscovery() {
  // Shared cached query also serves New Arrivals; no new catalogue access layer.
  const products = await getProducts();
  const categories = [
 {title:"Club Jerseys",href:"/clubs",match:(p:Product)=>Boolean(p.club)},
 {title:"National Teams",href:"/shop?teamType=national",match:(p:Product)=>!p.club&&Boolean(p.country)},
 {title:"Retro Jerseys",href:"/shop?category=retro",match:(p:Product)=>p.category==="retro"},
 {title:"Custom Jerseys",href:"/customize",match:(p:Product)=>p.inStock&&p.sizes.length>0},
 ].flatMap(category=>{const product=products.find(category.match);return product?[{...category,product}]:[];});
 return <><ShopByTeam products={products} /><Section id="shop-by-category" spacing="compact" aria-labelledby="category-heading"><Stack gap="4"><SectionHeader id="category-heading" title="Shop by Category" description="Explore jerseys for clubs, national teams, and more." action={<LinkButton href="/shop" variant="text">View all <Icon name="arrow" /></LinkButton>}/><div className="pl-category-grid">{categories.map(({title,href})=><Link className="pl-category-tile" href={href} key={title}><MarketingArtwork kind={title==="Club Jerseys"?"club":title==="National Teams"?"national":title==="Retro Jerseys"?"retro":"custom"} /><div className="pl-category-caption"><Heading as="h3" look="body-small">{title}</Heading><Icon name="arrow" /></div></Link>)}</div></Stack></Section></>;
}
