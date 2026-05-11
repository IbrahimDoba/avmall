"use client";

import * as React from "react";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { NIGERIAN_STATES, LAGOS_LGAS } from "@/lib/mock-data";

interface AddressPickerProps {
  state: string;
  city: string;
  onStateChange: (s: string) => void;
  onCityChange: (c: string) => void;
  className?: string;
}

/**
 * Two cascading selects — Nigerian state → LGA.
 * Currently only Lagos has populated LGAs (real list will come in Phase 4 seed).
 */
export function AddressPicker({
  state,
  city,
  onStateChange,
  onCityChange,
  className,
}: AddressPickerProps) {
  const lgas: readonly string[] = state === "Lagos" ? LAGOS_LGAS : ["—"];

  React.useEffect(() => {
    if (!lgas.includes(city)) {
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
        <Field id="lga" label="LGA">
          <Select id="lga" value={city} onChange={(e) => onCityChange(e.target.value)}>
            {lgas.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  );
}
