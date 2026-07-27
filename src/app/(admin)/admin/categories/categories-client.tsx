"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Plus,
  Pencil,
  Trash2,
  FolderPlus,
  Search,
  Loader2,
  Check,
  Tag,
  Package,
  GripVertical,
} from "lucide-react";
import { AdminTopBar } from "@/components/admin/topbar";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Money } from "@/components/ui/money";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { AdminCategory } from "@/lib/data/categories";

interface Props {
  initialCategories: AdminCategory[];
}

/** Subset of the product search API's ProductSearchHit that the picker needs. */
interface ProductHit {
  id: string;
  slug: string;
  name: string;
  brand: string;
  imageUrl: string;
  priceKobo: number;
  saleKobo: number | null;
  saleActive: boolean;
  category: string;
  categoryName: string;
}

export function CategoriesClient({ initialCategories }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const perms = session?.user?.permissions;
  // While the session loads (perms undefined) show actions optimistically; the
  // API enforces the real permission regardless (CLAUDE.md §2.5).
  const can = (p: string) => !perms || perms.includes(p);
  const canReorder = can("products.edit");

  // Stateful copy so drag-to-reorder can update order optimistically; re-synced
  // whenever the server sends a fresh list (after any mutation → router.refresh).
  const [categories, setCategories] = React.useState(initialCategories);
  React.useEffect(() => setCategories(initialCategories), [initialCategories]);
  const categoriesRef = React.useRef(categories);
  categoriesRef.current = categories;

  const totalProducts = categories.reduce((a, c) => a + c.totalProducts, 0);
  const liveProducts = categories.reduce((a, c) => a + c.publishedProducts, 0);

  // ── Drag-to-reorder (native HTML5 DnD, no extra deps) ──────────────────────
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);

  function onDragOver(e: React.DragEvent, overIndex: number) {
    if (!canReorder) return;
    e.preventDefault();
    if (dragIndex === null || dragIndex === overIndex) return;
    setCategories((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      if (moved) next.splice(overIndex, 0, moved);
      return next;
    });
    setDragIndex(overIndex);
  }

  async function persistOrder() {
    try {
      const res = await fetch("/api/v1/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: categoriesRef.current.map((c) => c.slug) }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json?.error?.message ?? "Could not save order");
        router.refresh(); // roll back to the server's order
      }
    } catch {
      toast.error("Network error");
      router.refresh();
    }
  }

  function onDragEnd() {
    if (dragIndex !== null) persistOrder();
    setDragIndex(null);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  async function createCategory() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not create category");
        return;
      }
      toast.success(`Created “${json.data.category.name}”`);
      setNewName("");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setCreating(false);
    }
  }

  // ── Rename ──────────────────────────────────────────────────────────────────
  const [renameTarget, setRenameTarget] = React.useState<AdminCategory | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [renaming, setRenaming] = React.useState(false);

  function openRename(c: AdminCategory) {
    setRenameTarget(c);
    setRenameValue(c.name);
  }

  async function submitRename() {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name) return;
    setRenaming(true);
    try {
      const res = await fetch(`/api/v1/admin/categories/${encodeURIComponent(renameTarget.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not rename");
        return;
      }
      toast.success("Category renamed");
      setRenameTarget(null);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setRenaming(false);
    }
  }

  // ── Delete (+ optional reassignment) ───────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = React.useState<AdminCategory | null>(null);
  const [moveTo, setMoveTo] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  function openDelete(c: AdminCategory) {
    setDeleteTarget(c);
    setMoveTo("");
  }

  async function submitDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.totalProducts > 0 && !moveTo) {
      toast.error("Pick a category to move the products into");
      return;
    }
    setDeleting(true);
    try {
      const qs = moveTo ? `?moveTo=${encodeURIComponent(moveTo)}` : "";
      const res = await fetch(
        `/api/v1/admin/categories/${encodeURIComponent(deleteTarget.slug)}${qs}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not delete");
        return;
      }
      toast.success(
        json.data?.movedTo
          ? `Deleted · moved ${json.data.movedProducts} product${json.data.movedProducts === 1 ? "" : "s"} to “${json.data.movedTo.name}”`
          : "Category deleted",
      );
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  }

  // ── Add products (bulk) ─────────────────────────────────────────────────────
  const [addTarget, setAddTarget] = React.useState<AdminCategory | null>(null);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<ProductHit[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [adding, setAdding] = React.useState(false);
  // Browse mode — recent products not already in this category, shown when the
  // search box is empty so admins can batch-assign without typing.
  const [browse, setBrowse] = React.useState<ProductHit[]>([]);
  const [browsing, setBrowsing] = React.useState(false);

  function openAdd(c: AdminCategory) {
    setAddTarget(c);
    setQuery("");
    setResults([]);
    setBrowse([]);
    setSelected(new Set());
  }

  // Load the browse list whenever the Add dialog opens with an empty query.
  React.useEffect(() => {
    if (!addTarget || query.trim().length >= 2) return;
    setBrowsing(true);
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `/api/v1/admin/products/browse?notInCategory=${encodeURIComponent(addTarget.slug)}&limit=50`,
          { signal: controller.signal },
        );
        const json = await res.json();
        if (res.ok) setBrowse((json.data?.products ?? []) as ProductHit[]);
      } catch {
        /* aborted or network blip */
      } finally {
        setBrowsing(false);
      }
    })();
    return () => controller.abort();
  }, [addTarget, query]);

  // Debounced product search while the Add dialog is open.
  React.useEffect(() => {
    if (!addTarget) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/admin/products/search?q=${encodeURIComponent(q)}&limit=20`,
          { signal: controller.signal },
        );
        const json = await res.json();
        if (res.ok) setResults((json.data?.products ?? []) as ProductHit[]);
      } catch {
        /* aborted or network blip */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, addTarget]);

  function toggleSelected(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function submitAdd() {
    if (!addTarget || selected.size === 0) return;
    setAdding(true);
    try {
      const res = await fetch("/api/v1/admin/products/bulk-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: Array.from(selected), categorySlug: addTarget.slug }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not add products");
        return;
      }
      const moved = json.data?.updated ?? 0;
      toast.success(`Added ${moved} product${moved === 1 ? "" : "s"} to “${addTarget.name}”`);
      setAddTarget(null);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setAdding(false);
    }
  }

  // Destinations available when reassigning on delete (everything except the
  // category being deleted).
  const moveOptions = deleteTarget
    ? categories.filter((c) => c.slug !== deleteTarget.slug)
    : [];

  // Picker shows the browse list while the search box is empty, search hits once
  // the admin types.
  const isBrowse = !!addTarget && query.trim().length < 2;
  const pickerLoading = isBrowse ? browsing : searching;
  const pickerItems = isBrowse ? browse : results;

  return (
    <>
      <AdminTopBar breadcrumbs={[{ label: "Categories" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[1100px] mx-auto">
          <PageHeader
            title="Categories"
            subtitle={`${categories.length} categor${categories.length === 1 ? "y" : "ies"} · ${totalProducts} products · ${liveProducts} live`}
          />

          {/* Create */}
          {can("products.create") && (
            <div className="flex items-center gap-2 mb-6 max-w-md">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New category name, e.g. Power banks"
                onKeyDown={(e) => {
                  if (e.key === "Enter") createCategory();
                }}
              />
              <Button onClick={createCategory} disabled={creating || !newName.trim()}>
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Add
              </Button>
            </div>
          )}

          {/* List */}
          {categories.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-fg-muted">
              <Tag className="size-8 mx-auto mb-3 opacity-40" />
              <div className="font-semibold text-fg">No categories yet</div>
              <div className="text-sm mt-1">Create your first category above.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {categories.map((c, i) => (
                <div
                  key={c.id}
                  draggable={canReorder}
                  onDragStart={() => canReorder && setDragIndex(i)}
                  onDragOver={(e) => onDragOver(e, i)}
                  onDragEnd={onDragEnd}
                  className={cn(
                    "rounded-lg border border-border bg-surface p-4 flex flex-col gap-3 transition-opacity",
                    dragIndex === i && "opacity-40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-1.5 min-w-0">
                      {canReorder && (
                        <GripVertical
                          className="size-4 mt-0.5 text-fg-subtle flex-shrink-0 cursor-grab active:cursor-grabbing"
                          aria-hidden
                        />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold truncate">{c.name}</div>
                        <div className="text-[11px] text-fg-muted font-mono truncate">/{c.slug}</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-fg-muted flex-shrink-0">
                      <Package className="size-3" />
                      {c.totalProducts}
                    </span>
                  </div>

                  <Link
                    href={`/admin/products?category=${encodeURIComponent(c.slug)}`}
                    className="text-xs text-fg-muted hover:text-brand-primary transition-colors"
                    title={`View products in ${c.name}`}
                  >
                    <span className="font-semibold text-fg">{c.totalProducts}</span> product
                    {c.totalProducts === 1 ? "" : "s"} ·{" "}
                    <span className="font-semibold text-success">{c.publishedProducts}</span> live
                    {c.totalProducts > c.publishedProducts && (
                      <span className="text-warning">
                        {" "}
                        · {c.totalProducts - c.publishedProducts} draft/archived
                      </span>
                    )}
                  </Link>

                  <div className="flex items-center gap-1.5 mt-auto pt-1">
                    {can("products.edit") && (
                      <Button variant="secondary" size="sm" onClick={() => openAdd(c)}>
                        <FolderPlus className="size-3.5" /> Add products
                      </Button>
                    )}
                    {can("products.edit") && (
                      <button
                        onClick={() => openRename(c)}
                        className="inline-flex items-center justify-center size-8 rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
                        aria-label={`Rename ${c.name}`}
                        title="Rename"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    )}
                    {can("products.delete") && (
                      <button
                        onClick={() => openDelete(c)}
                        className="inline-flex items-center justify-center size-8 rounded-md text-fg-muted hover:bg-danger-bg hover:text-danger"
                        aria-label={`Delete ${c.name}`}
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !renaming && !o && setRenameTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename category</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
              }}
            />
            <p className="text-xs text-fg-muted mt-2">
              The web address (/{renameTarget?.slug}) stays the same so existing links keep working.
            </p>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setRenameTarget(null)} disabled={renaming}>
              Cancel
            </Button>
            <Button onClick={submitRename} disabled={renaming || !renameValue.trim()}>
              {renaming && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !deleting && !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete “{deleteTarget?.name}”?</DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-3">
            {deleteTarget && deleteTarget.totalProducts > 0 ? (
              <>
                <p className="text-sm text-fg-muted">
                  This category has{" "}
                  <span className="font-semibold text-fg">{deleteTarget.totalProducts}</span>{" "}
                  product{deleteTarget.totalProducts === 1 ? "" : "s"}. Choose a category to move
                  them into — products must always belong to one category.
                </p>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-fg-muted mb-2">
                    Move products to
                  </div>
                  <Select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                    <option value="">Select a category…</option>
                    {moveOptions.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            ) : (
              <p className="text-sm text-fg-muted">
                This category is empty and will be permanently removed.
              </p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitDelete}
              disabled={deleting || (!!deleteTarget && deleteTarget.totalProducts > 0 && !moveTo)}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add products dialog */}
      <Dialog open={!!addTarget} onOpenChange={(o) => !adding && !o && setAddTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add products to “{addTarget?.name}”</DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-3">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products by name or brand…"
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
              {isBrowse ? "Recent products not in this category" : `Results for “${query.trim()}”`}
            </div>

            <div className="min-h-[8rem] max-h-72 overflow-y-auto rounded-md border border-border divide-y divide-border">
              {pickerLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-fg-muted">
                  <Loader2 className="size-4 animate-spin" /> {isBrowse ? "Loading…" : "Searching…"}
                </div>
              ) : pickerItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-fg-muted">
                  {isBrowse
                    ? "No other products to add."
                    : `No products match “${query.trim()}”.`}
                </div>
              ) : (
                pickerItems.map((p) => {
                  const alreadyHere = p.category === addTarget?.slug;
                  const isSelected = selected.has(p.slug);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={alreadyHere}
                      onClick={() => toggleSelected(p.slug)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        alreadyHere
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-surface-2",
                        isSelected && "bg-info-bg",
                      )}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 size-5 rounded border flex items-center justify-center",
                          isSelected
                            ? "bg-brand-primary border-brand-primary text-brand-primary-fg"
                            : "border-border-strong",
                        )}
                      >
                        {isSelected && <Check className="size-3.5" strokeWidth={3} />}
                      </div>
                      <div className="relative size-9 rounded-md overflow-hidden flex-shrink-0 bg-surface-2">
                        {p.imageUrl && (
                          <Image src={p.imageUrl} alt={p.name} fill sizes="36px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{p.name}</div>
                        <div className="text-[11px] text-fg-muted truncate">
                          {p.brand} · {p.categoryName}
                        </div>
                      </div>
                      {alreadyHere ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-fg-muted flex-shrink-0">
                          Already here
                        </span>
                      ) : (
                        <Money
                          kobo={p.saleActive && p.saleKobo != null ? p.saleKobo : p.priceKobo}
                          className="text-xs font-bold flex-shrink-0"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter className="mt-4 items-center justify-between">
            <span className="text-xs text-fg-muted mr-auto">
              {selected.size} selected
            </span>
            <Button variant="ghost" onClick={() => setAddTarget(null)} disabled={adding}>
              Cancel
            </Button>
            <Button onClick={submitAdd} disabled={adding || selected.size === 0}>
              {adding && <Loader2 className="size-4 animate-spin" />}
              Add {selected.size > 0 ? selected.size : ""} to category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
