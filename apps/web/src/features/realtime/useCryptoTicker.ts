import { useEffect, useMemo, useRef, useState } from "react";

type Status = "idle" | "connecting" | "open" | "closed" | "error";
type Prices = Record<string, number>;

export function useCryptoTicker(inputAssets: string[] = ["bitcoin"]) {
  const [status, setStatus] = useState<Status>("idle");
  const [prices, setPrices] = useState<Prices>({});
  const wsRef = useRef<WebSocket | null>(null);
  const closedByUs = useRef(false);

  const list = useMemo(() => {
    const cleaned = inputAssets
      .map(a => a.trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(cleaned)).sort(); // dedupe + sort
  }, [inputAssets]);

  // A stable key that doesn’t change when order changes upstream
  const key = list.join(",");

  const connIdRef = useRef(0);

  useEffect(() => {
    console.log("[ws] asset set key:", key);
  }, [key]);
  
  useEffect(() => {
    console.log("[ws] status =>", status);
  }, [status]);

  useEffect(() => {
    if (list.length === 0) {
        setStatus("idle");
        setPrices({});
        return;
    }

    const myId = ++connIdRef.current;

    closedByUs.current = false;
    setStatus("connecting");
    const url = `wss://ws.coincap.io/prices?assets=${encodeURIComponent(key)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    const isCurrent = () => connIdRef.current === myId;

    ws.onopen = () => {
        if (!isCurrent()) return;
        setStatus("open");
        // optional: clear prices on new set
        setPrices(prev => {
          // keep only keys in the current list
          const next: Prices = {};
          for (const a of list) if (prev[a] != null) next[a] = prev[a];
          return next;
        });
      };
    ws.onmessage = (evt) => {
        if (!isCurrent()) return;
        try {
            const patch = JSON.parse(evt.data as string) as Record<string, string>;
            setPrices(prev => {
                const next = { ...prev };
                for (const [k, v] of Object.entries(patch)) {
                // only track assets we asked for
                if (list.includes(k)) next[k] = Number(v);
                }
                return next;
            });
        } catch {
        // ignore parse errors for this minimal example
      }
    };

    ws.onerror = () => {
        if (!isCurrent()) return;
        // error often followed by onclose; keep UI calm
        setStatus((s) => (s === "closed" ? s : "error"));
      };
  
    ws.onclose = () => {
        if (!isCurrent()) return;
        if (closedByUs.current) return; // StrictMode double-unmount
        setStatus("closed");
    };

    return () => {
        closedByUs.current = true;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            try { ws.close(1000, "component unmounted"); } catch (err) {console.error(err)}
        }
        if (wsRef.current === ws) wsRef.current = null;
    };
  }, [key]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug("[ws] status =>", status);
  }, [status]);

  return { status, prices, assets: list };
}
