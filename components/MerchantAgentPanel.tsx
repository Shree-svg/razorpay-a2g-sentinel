"use client";
import React, { useEffect, useState } from "react";
import { useAudit } from "@/contexts/AuditContext";

interface CatalogItem {
  sku: string;
  name: string;
  price_inr: number;
  stock_available: number;
  description: string;
}

export default function MerchantAgentPanel() {
  const { addLog } = useAudit();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCatalog() {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch("/api/merchant");
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          const reason = body?.reason ?? `HTTP ${resp.status}`;
          throw new Error(reason);
        }
        const data: CatalogItem[] = await resp.json();
        if (!cancelled) {
          setCatalog(data);
          addLog({
            actor: "merchant",
            action: "fetch_catalog",
            payload: { itemCount: data.length },
            status: "success",
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.message ?? String(err);
          setError(msg);
          addLog({
            actor: "merchant",
            action: "fetch_catalog",
            payload: { error: msg },
            status: "error",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCatalog();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatPrice = (amount: number) =>
    `₹${amount.toLocaleString("en-IN")}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header — matches Buyer Agent panel conventions */}
      <div className="flex items-center justify-between pb-2 border-b border-purple-900/10 mb-2 shrink-0">
        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">
          Merchant Agent
        </span>
        <span className="text-[10px] bg-purple-950/80 border border-purple-900/40 text-purple-300 font-mono px-1.5 py-0.5 rounded">
          CATALOG PROXY
        </span>
      </div>

      {/* Content area — scrollable */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs min-h-0">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8 space-x-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
            <span className="text-purple-300 font-mono text-[11px]">
              Fetching sanitized catalog…
            </span>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-lg">
            <p className="font-mono text-[10px] text-red-400 mb-1">FETCH_FAILED</p>
            <p className="text-slate-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-[10px] font-mono text-red-300 underline underline-offset-2 hover:text-red-200"
            >
              Reload page to retry
            </button>
          </div>
        )}

        {/* Catalog status badge */}
        {!loading && !error && (
          <div className="bg-slate-900/70 border border-slate-850 p-2.5 rounded-lg text-slate-400">
            <span className="text-purple-400 font-semibold">Catalog Status:</span>
            <p className="mt-1 font-mono text-[11px] text-purple-300">
              Sanitized (Proxy On) · {catalog.length} SKU{catalog.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* SKU cards */}
        {!loading &&
          !error &&
          catalog.map((item) => (
            <div
              key={item.sku}
              className="bg-purple-900/10 border border-purple-900/20 p-2.5 rounded-lg"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-200 truncate mr-2">
                  {item.name}
                </span>
                <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded shrink-0">
                  {item.sku}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mb-1.5 line-clamp-2">
                {item.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-emerald-400 text-[12px]">
                  {formatPrice(item.price_inr)}
                </span>
                <span
                  className={`font-mono text-[10px] ${
                    item.stock_available > 0 ? "text-slate-500" : "text-red-400"
                  }`}
                >
                  {item.stock_available > 0
                    ? `${item.stock_available} in stock`
                    : "OUT OF STOCK"}
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
