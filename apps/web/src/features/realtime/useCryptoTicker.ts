import { useEffect, useMemo, useRef, useState } from "react";

type Status = "idle" | "connecting" | "open" | "closed" | "error";
type PriceCell = { value: number; live: boolean }; // live=false = from REST seed
type Prices = Record<string, PriceCell | undefined>;
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
    let seedAbort: AbortController | undefined;

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
        // ---- REST snapshot seed (gray) ----
        seedAbort = new AbortController();
        fetch(`http://localhost:4000/external/prices?ids=${encodeURIComponent(key)}`, { signal: seedAbort.signal })
            .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then((payload: { data: Array<{ id: string; priceUsd: string }> }) => {
                if (!isCurrent()) return;
                const data = payload?.data ?? [];
                setPrices(prev => {
                    const next: Prices = { ...prev };
                    for (const a of list) {
                    const hit = data.find(d => d.id === a);
                    if (hit?.priceUsd) {
                        // Only set seed if we don't already have a live tick
                        const existing = next[a];
                        if (!existing || !existing.live) {
                        next[a] = { value: Number(hit.priceUsd), live: false };
                        }
                    }
                    }
                    return next;
                });
            })
            .catch(() => {
            /* ignore seed errors; WS will still update */
            }
        );
    };
    ws.onmessage = (evt) => {
        if (!isCurrent()) return;
        try {
            const patch = JSON.parse(evt.data as string) as Record<string, string>;
            setPrices(prev => {
                const next = { ...prev };
                for (const [k, v] of Object.entries(patch)) {
                    // only track assets we asked for
                    if (list.includes(k)) {
                        next[k] = { value: Number(v), live: true }; // mark as live (black)
                    }                
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
