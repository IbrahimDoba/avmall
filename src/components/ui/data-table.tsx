"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type PaginationState,
  type Table as ReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  /** Set to enable row selection (adds a leading checkbox column). */
  enableSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (s: RowSelectionState) => void;
  /** Per-page size (defaults to 10). */
  pageSize?: number;
  /** Hide pagination when caller wants to render their own. */
  hidePagination?: boolean;
  /** Click on a row (excluding the checkbox cell). */
  onRowClick?: (row: TData) => void;
  /** Render extra toolbar slot above the table (e.g. bulk actions). */
  toolbar?: (table: ReactTable<TData>) => React.ReactNode;
  className?: string;
}

export function DataTable<TData>({
  columns: userColumns,
  data,
  isLoading,
  emptyState,
  enableSelection,
  rowSelection,
  onRowSelectionChange,
  pageSize = 10,
  hidePagination,
  onRowClick,
  toolbar,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const columns = React.useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!enableSelection) return userColumns;
    return [
      {
        id: "__select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllRowsSelected()
                ? true
                : table.getIsSomeRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(v) => table.toggleAllRowsSelected(v === true)}
            aria-label="Select all rows"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(v === true)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        size: 32,
      },
      ...userColumns,
    ];
  }, [enableSelection, userColumns]);

  const tableOptions = {
    data,
    columns,
    state: {
      sorting,
      pagination,
      ...(rowSelection != null && { rowSelection }),
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    ...(onRowSelectionChange && {
      onRowSelectionChange: (updater: ((s: RowSelectionState) => RowSelectionState) | RowSelectionState) => {
        const next =
          typeof updater === "function" ? updater(rowSelection ?? {}) : updater;
        onRowSelectionChange(next);
      },
    }),
  };

  const table = useReactTable(tableOptions);

  const colCount = columns.length;

  return (
    <div className={cn("rounded-lg border border-border bg-surface shadow-sm overflow-hidden", className)}>
      {toolbar && (
        <div className="border-b border-border">{toolbar(table)}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const sort = header.column.getIsSorted();
                  const isSelect = header.column.id === "__select";
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-fg-muted",
                        isSelect && "w-8",
                      )}
                      style={{ width: header.column.columnDef.size }}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-fg"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sort === "asc" ? (
                            <ChevronUp className="size-3" />
                          ) : sort === "desc" ? (
                            <ChevronDown className="size-3" />
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-50" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: pageSize }, (_, i) => (
                <tr key={i} className="border-t border-border">
                  {columns.map((c, j) => (
                    <td key={j} className="px-3.5 py-3">
                      <Skeleton className="h-4 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-3.5 py-12">
                  {emptyState ?? (
                    <div className="text-center text-sm text-fg-muted">No results.</div>
                  )}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    "border-t border-border hover:bg-surface-2 transition-colors",
                    onRowClick && "cursor-pointer",
                    row.getIsSelected() && "bg-info-bg/40",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      onClick={
                        cell.column.id === "__select"
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                      className="px-3.5 py-3 align-middle"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!hidePagination && table.getPageCount() > 1 && (
        <div className="px-4 py-3 border-t border-border bg-surface-2">
          <Pagination
            page={table.getState().pagination.pageIndex + 1}
            total={data.length}
            perPage={table.getState().pagination.pageSize}
            onChange={(p) => table.setPageIndex(p - 1)}
          />
        </div>
      )}
    </div>
  );
}
