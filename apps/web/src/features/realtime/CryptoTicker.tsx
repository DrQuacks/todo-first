import React from "react";
import { useCryptoTicker } from "./useCryptoTicker";

const statusColor: Record<string, string> = {
  idle: "#999",
  connecting: "#ffb020",
  open: "#22a06b",
  closed: "#666",
  error: "#d64545",
};

export default function CryptoTicker({
  assets = ["bitcoin", "ethereum", "solana"],
  compact = true,
}: { assets?: string[]; compact?: boolean }) {
  const { status, prices, assets: active, lastUpdate } = useCryptoTicker(assets);
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
      <div style={{ fontSize: 11, color: "#666", textAlign: "right" }}>
            {lastUpdate
            ? `Last tick: ${lastUpdate.toLocaleTimeString()}`
            : "Waiting for first tick…"}
        </div>

      {/* prices for currently selected assets, in order */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {active.map((a) => {
          const cell = prices[a];
          const isLive = !!cell?.live;
          const val = cell?.value;

          return (
            <li key={a} style={{ color: isLive ? "#111" : "#777" }}>
              {a.slice(0, 3).toUpperCase()}: {val != null
                ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
                : "—"}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
