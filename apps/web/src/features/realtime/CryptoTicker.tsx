import { useCryptoTicker } from "./useCryptoTicker";

export default function CryptoTicker({ asset = "bitcoin", compact = true }: { asset?: string; compact?: boolean }) {
  const { status, price } = useCryptoTicker(asset);

  return (
    <div
      style={{
        padding: compact ? "4px 8px" : 12,
        border: "1px solid #ddd",
        borderRadius: 8,
        fontSize: compact ? 12 : 14,
        background: "#f9f9f9",
        minWidth: compact ? 160 : 220,
        textAlign: "right",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {status === "open" ? "Live" : status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
      <div>
        {asset.toUpperCase()}:{" "}
        {price != null ? price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
      </div>
    </div>
  );
}
