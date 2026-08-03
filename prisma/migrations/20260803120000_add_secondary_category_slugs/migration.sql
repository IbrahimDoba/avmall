-- Extra categories a product also appears under (Category slugs), on top of the
-- primary `category_id`. Lets one product show in several categories without a
-- join table. Defaults to an empty array for every existing product.
ALTER TABLE "products"
  ADD COLUMN "secondary_category_slugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
