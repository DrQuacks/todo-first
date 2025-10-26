import React from "react";
import { useCryptoTicker } from "./useCryptoTicker";

export default function CryptoTicker({
  assets = ["bitcoin", "ethereum", "solana"],
  compact = true,
}: { assets?: string[]; compact?: boolean }) {
  const { status, prices, assets: active } = useCryptoTicker(assets);

  const entries = active.map(a => [a, prices[a]] as const);

  return (
    <div
      style={{
        padding: compact ? "4px 8px" : 12,
        border: "1px solid #ddd",
        borderRadius: 8,
        fontSize: compact ? 12 : 14,
        background: "#f9f9f9",
        minWidth: compact ? 180 : 240,
        textAlign: "right",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {status === "open" ? "Live" : status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
      {entries.length === 0 ? (
        <div>—</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {entries.map(([asset, price]) => (
            <li key={asset}>
              {asset.slice(0, 3).toUpperCase()}:{" "}
              {price != null ? price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
