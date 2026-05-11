"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import type { StaffRole } from "@/lib/admin-mock-data";
import { ROLE_LABELS } from "@/lib/admin-mock-data";
import { cn } from "@/lib/utils";

export interface PermissionRow {
  label: string;
  /** Roles that have this permission. */
  roles: StaffRole[];
}

export interface PermissionGroup {
  group: string;
  rows: PermissionRow[];
}

interface PermissionMatrixProps {
  groups: PermissionGroup[];
  roles: StaffRole[];
  /** Make the cells togglable. */
  editable?: boolean;
  onToggle?: (group: string, label: string, role: StaffRole, next: boolean) => void;
  className?: string;
}

export function PermissionMatrix({
  groups,
  roles,
  editable,
  onToggle,
  className,
}: PermissionMatrixProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead className="bg-surface-2 sticky top-0">
          <tr>
            <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-fg-muted">
              Permission
            </th>
            {roles.map((r) => (
              <th
                key={r}
                className="text-center px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-fg-muted min-w-24"
              >
                {ROLE_LABELS[r]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <React.Fragment key={g.group}>
              <tr className="bg-surface-2/50">
                <td
                  colSpan={roles.length + 1}
                  className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-fg-muted"
                >
                  {g.group}
                </td>
              </tr>
              {g.rows.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <td className="px-3.5 py-2.5 text-sm font-medium">{row.label}</td>
                  {roles.map((r) => {
                    const has = row.roles.includes(r);
                    if (editable && onToggle) {
                      return (
                        <td key={r} className="text-center px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => onToggle(g.group, row.label, r, !has)}
                            className={cn(
                              "inline-flex size-6 items-center justify-center rounded transition-colors",
                              has
                                ? "bg-success-bg text-success hover:bg-success/20"
                                : "text-fg-subtle hover:bg-surface-2",
                            )}
                          >
                            {has ? (
                              <Check className="size-3.5" strokeWidth={3} />
                            ) : (
                              <X className="size-3.5" />
                            )}
                          </button>
                        </td>
                      );
                    }
                    return (
                      <td key={r} className="text-center px-3 py-2.5">
                        {has ? (
                          <Check className="size-4 text-success inline-block" strokeWidth={3} />
                        ) : (
                          <X className="size-4 text-fg-subtle inline-block" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

