import React from "react";

const ALL = ["bitcoin", "ethereum", "solana", "dogecoin"];

export default function AssetsPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  // toggle helper
  const toggle = (name: string) => {
    const key = name.trim().toLowerCase();
    if (!key) return;
    const has = selected.includes(key);
    const next = has ? selected.filter(a => a !== key) : [...selected, key];
    onChange(next);
  };

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <strong>Assets:</strong>
      {ALL.map((name) => {
        const key = name.toLowerCase();
        const checked = selected.includes(key);
        return (
          <label key={key} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(key)}
            />
            {name}
          </label>
        );
      })}
      {/* Clear-all button */}
      <button
        type="button"
        onClick={() => onChange([])}
        style={{ marginLeft: 8 }}
        aria-label="Clear all assets"
      >
        clear
      </button>
    </div>
  );
}
