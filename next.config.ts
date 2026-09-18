import type { NextConfig } from "next";
import { getProductImageOrigin, productImageEndpoint } from "./src/utils/product-image";
const origin = getProductImageOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
if (!origin && process.env.NODE_ENV === "production") {
  throw new Error("Supabase image origin is required in production.");
}
const nextConfig: NextConfig = {
  images: {
    remotePatterns: origin ? [{
      protocol: "https", hostname: new URL(origin).hostname, port: "",
      pathname: productImageEndpoint + "**", search: "",
    }] : [],
    maximumRedirects: 0,
    dangerouslyAllowSVG: false,
    dangerouslyAllowLocalIP: false,
  },
};
export default nextConfig;
