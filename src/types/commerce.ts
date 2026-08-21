export interface WhatsappCatalog {
  id: string;
  name: string;
  product_count?: number;
  vertical?: string;
}

export type ProductAvailability = "in stock" | "out of stock" | "preorder" | "available for order" | "discontinued";
export type ProductCondition = "new" | "refurbished" | "used";

export interface WhatsappProduct {
  id: string;
  retailer_id: string;
  name: string;
  description?: string;
  price?: string; // Graph returns formatted price, e.g. "1999" (minor units) with currency separate
  currency?: string;
  image_url?: string;
  url?: string;
  availability?: ProductAvailability;
  condition?: ProductCondition;
  brand?: string;
  category?: string;
  visibility?: "published" | "staging";
}

export interface CreateProductInput {
  /** Your own SKU/ID for this product — must match what's used in `productRetailerId` when sending product messages. */
  retailerId: string;
  name: string;
  description?: string;
  /** Price in the smallest currency unit (e.g. cents), as an integer. */
  price: number;
  currency: string;
  imageUrl: string;
  url?: string;
  availability?: ProductAvailability;
  condition?: ProductCondition;
  brand?: string;
  category?: string;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface ListProductsParams {
  limit?: number;
  after?: string;
  before?: string;
}

export interface CommerceSettings {
  is_catalog_visible: boolean;
  is_cart_enabled: boolean;
}

export interface UpdateCommerceSettingsInput {
  isCatalogVisible?: boolean;
  isCartEnabled?: boolean;
}
