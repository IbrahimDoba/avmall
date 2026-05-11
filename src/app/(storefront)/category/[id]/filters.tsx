"use client";

import * as React from "react";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export function CategoryFilters() {
  const [open, setOpen] = React.useState(false);
  const [inStock, setInStock] = React.useState(false);
  const [sort, setSort] = React.useState("featured");
  const activeCount = inStock ? 1 : 0;

  return (
    <>
      <div className="sticky top-14 z-10 bg-bg border-b border-border px-4 py-2 flex gap-2 items-center">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            open ? "bg-info-bg border-brand-primary/30 text-brand-primary" : "bg-surface border-border text-fg"
          }`}
        >
          Filters
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-4 h-4 rounded-full bg-brand-primary text-brand-primary-fg text-[10px] font-bold px-1">
              {activeCount}
            </span>
          )}
        </button>
        <div className="flex-1" />
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-8 text-xs w-[160px]"
        >
          <option value="featured">Featured</option>
          <option value="lo">Price: low to high</option>
          <option value="hi">Price: high to low</option>
          <option value="new">Newest</option>
          <option value="best">Best selling</option>
        </Select>
      </div>

      {open && (
        <div className="bg-surface-2 border-b border-border px-4 py-3 space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={inStock} onCheckedChange={(c) => setInStock(c === true)} />
            <span>In stock only</span>
          </label>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-fg-muted mb-1.5">
              Price (₦)
            </div>
            <div className="flex gap-2">
              <Input placeholder="Min" className="flex-1 h-9" inputMode="numeric" />
              <Input placeholder="Max" className="flex-1 h-9" inputMode="numeric" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
