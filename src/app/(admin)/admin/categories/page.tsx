import { listCategoriesAdmin } from "@/lib/data/categories";
import { CategoriesClient } from "./categories-client";

// Categories management always reads live counts — never prerender.
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesAdmin();
  return <CategoriesClient initialCategories={categories} />;
}
