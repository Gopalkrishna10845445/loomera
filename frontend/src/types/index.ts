export interface ProductSwatch {
  name: string;
  color: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  isOnSale?: boolean;
  category: string;
  categorySlug: 'men' | 'boys' | 'kids' | 'handloom' | 'father-son';
  badge: string;
  desc: string;
  origin: string;
  weight: string;
  image: string;
  swatches: ProductSwatch[];
  sizes: string[];
  fabricCare?: string;
  craftDetail?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  color: string;
  size: string;
  image: string;
  quantity: number;
}

export interface Fabric {
  id: string;
  name: string;
  origin: string;
  desc: string;
  stat1: string;
  stat2: string;
  stat3: string;
  image1: string;
  image2: string;
}
