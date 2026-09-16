/** Manually maintained products contract from 001_initial_schema.sql.
 * Other tables are intentionally outside this application contract for now.
 * SQL CHECK constraints remain strings here; validate them at the adapter boundary.
 * Insert/Update describe row shapes, not permission to write through the API.
 */
type ProductDatabaseRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_kobo: number;
  original_price_kobo: number | null;
  image_path: string | null;
  images: string[];
  club: string | null;
  league: string | null;
  country: string | null;
  category: string;
  season: string;
  sizes: string[];
  is_new: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  in_stock: boolean;
  is_active: boolean;
  currency: string;
  created_at: string;
  updated_at: string;
};

type ProductInsert = Pick<ProductDatabaseRow, "name" | "slug" | "price_kobo" | "category" | "season"> &
  Partial<Omit<ProductDatabaseRow, "name" | "slug" | "price_kobo" | "category" | "season">>;

export type Database = {
  public: {
    Tables: {
      products: {
        Row: ProductDatabaseRow;
        Insert: ProductInsert;
        Update: Partial<ProductDatabaseRow>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
