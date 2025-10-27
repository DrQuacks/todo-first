import React from "react";
import { useCryptoTicker } from "./useCryptoTicker";

const statusColor: Record<string, string> = {
  idle: "#999",
  connecting: "#ffb020",
  open: "#22a06b",
  closed: "#666",
  error: "#d64545",
  retrying: "#ff8a00" // only if you add retries later
};

export default function CryptoTicker({
  assets = ["bitcoin", "ethereum", "solana"],
  compact = true,
}: { assets?: string[]; compact?: boolean }) {
  const { status, prices, assets: active } = useCryptoTicker(assets);

  const entries = active.map(a => [a, prices[a]] as const);
  const color = statusColor[status] ?? "#999";

  return (
    <div
      style={{
        padding: compact ? "6px 10px" : 12,
        border: "1px solid #ddd",
        borderRadius: 8,
        fontSize: compact ? 12 : 14,
        background: "#f9f9f9",
        minWidth: compact ? 210 : 260,
        textAlign: "right",
        display: "grid",
        gap: 6,
      }}
    >
      {/* status chip */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, justifySelf: "end" }}
           aria-label={`WebSocket status: ${status}`}>
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: 999,
            background: color,
            boxShadow: `0 0 0 2px ${color}22`,
          }}
        />
        <strong style={{ textTransform: "capitalize" }}>{status}</strong>
      </div>

      {/* prices */}
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
