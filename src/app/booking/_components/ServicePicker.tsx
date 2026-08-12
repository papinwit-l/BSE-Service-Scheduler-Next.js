"use client";

import { Check } from "lucide-react";

type Service = {
  id: string;
  name: string;
  description: string | null;
};

type Props = {
  services: Service[];
  selected: string[];
  onChange: (ids: string[]) => void;
  error?: string;
};

export default function ServicePicker({ services, selected, onChange, error }: Props) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div>
      <label className="input-label mb-3 text-sm">
        เลือกบริการ <span className="text-text-muted">(เลือกได้หลายรายการ)</span>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        {services.map((service) => {
          const isSelected = selected.includes(service.id);
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => toggle(service.id)}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                isSelected
                  ? "border-accent-border bg-accent-subtle"
                  : "border-border bg-primary hover:border-border"
              }`}
            >
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${
                  isSelected
                    ? "border-accent bg-accent text-on-accent"
                    : "border-border bg-primary-light"
                }`}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <div>
                <div className="text-sm font-medium text-text-heading">
                  {service.name}
                </div>
                {service.description && (
                  <div className="mt-1 text-xs text-text-muted">
                    {service.description}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="field-error mt-2">{error}</p>}
    </div>
  );
}
