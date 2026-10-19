import { Box } from "@sd/ui";
import { getProducts } from "@/lib/products/queries";
import { JerseyStudio } from "./jersey-studio";
export async function KitLab({initialSlug}:{initialSlug?:string}){const products=await getProducts();return <Box as="section" id="kit-lab" py="6" aria-label="Personalise your jersey"><JerseyStudio products={products} initialSlug={initialSlug}/></Box>;}
