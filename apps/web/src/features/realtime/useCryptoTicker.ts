import { useEffect, useRef, useState } from "react";

type Status = "idle" | "connecting" | "open" | "closed" | "error";

export function useCryptoTicker(asset = "bitcoin") {
  const [status, setStatus] = useState<Status>("idle");
  const [price, setPrice] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const name = asset.trim().toLowerCase();
    if (!name) {
      setStatus("idle");
      return;
    }

    setStatus("connecting");
    const ws = new WebSocket(`wss://ws.coincap.io/prices?assets=${name}`);
    wsRef.current = ws;

    ws.onopen = () => setStatus("open");

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as Record<string, string>;
        if (data[name]) setPrice(Number(data[name]));
      } catch {
        // ignore parse errors for this minimal example
      }
    };

    ws.onerror = () => setStatus("error");
    ws.onclose = () => setStatus("closed");

    return () => {
      try { ws.close(); } catch (err) {
        console.error(err)
      }
      wsRef.current = null;
    };
  }, [asset]);

  return { status, price };
}
