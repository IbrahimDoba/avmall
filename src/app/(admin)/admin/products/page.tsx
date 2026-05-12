import { listProducts } from "@/lib/data/products";
import { ProductsListClient } from "./products-client";

export default async function AdminProductsListPage() {
  const products = await listProducts({ limit: 200, includeUnpublished: true });
  return <ProductsListClient products={products} />;
}
