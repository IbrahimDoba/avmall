"use client";

import * as React from "react";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { NIGERIAN_STATES } from "@/lib/mock-data";
import { NIGERIA_LGAS } from "@/lib/nigeria-lgas";

interface AddressPickerProps {
  state: string;
  city: string;
  onStateChange: (s: string) => void;
  onCityChange: (c: string) => void;
  className?: string;
}

export function AddressPicker({
  state,
  city,
  onStateChange,
  onCityChange,
  className,
}: AddressPickerProps) {
  const lgas: readonly string[] = NIGERIA_LGAS[state] ?? [];

  React.useEffect(() => {
    if (lgas.length > 0 && !lgas.includes(city)) {
      onCityChange(lgas[0]!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field id="state" label="State">
          <Select id="state" value={state} onChange={(e) => onStateChange(e.target.value)}>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="lga" label="LGA / Area">
          <Select
            id="lga"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            disabled={lgas.length === 0}
          >
            {lgas.length === 0 ? (
              <option value="">Select state first</option>
            ) : (
              lgas.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))
            )}
          </Select>
        </Field>
      </div>
    </div>
  );
}
