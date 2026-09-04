"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useAudit } from "@/contexts/AuditContext";

interface CatalogItem {
  sku: string;
  name: string;
  price_inr: number;
  stock_available: number;
  description: string;
}

const PAGE_SIZE = 20;

export default function MerchantAgentPanel() {
  const { addLog } = useAudit();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

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

  // Filter by search term, then paginate — never render all 1001 at once
  const filtered = useMemo(() => {
    if (!search.trim()) return catalog;
    const q = search.toLowerCase();
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [catalog, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatPrice = (amount: number) =>
    `₹${amount.toLocaleString("en-IN")}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 mb-2 shrink-0">
        <span className="text-xs font-semibold text-rzp-navy uppercase tracking-wide">
          Merchant Agent
        </span>
        <span className="text-[10px] bg-gray-100 border border-gray-200 text-gray-600 font-mono px-1.5 py-0.5 rounded">
          CATALOG PROXY
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs min-h-0">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8 space-x-2">
            <span className="w-2 h-2 rounded-full bg-rzp-blue animate-ping" />
            <span className="text-gray-500 font-mono text-[11px]">
              Fetching sanitized catalog…
            </span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
            <p className="font-mono text-[10px] text-rzp-error font-bold mb-1">FETCH_FAILED</p>
            <p className="text-gray-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-[10px] font-mono text-rzp-error underline underline-offset-2 hover:text-red-700"
            >
              Reload page to retry
            </button>
          </div>
        )}

        {/* Catalog status + search */}
        {!loading && !error && (
          <>
            <div className="bg-white border border-gray-200 p-2.5 rounded-lg text-gray-700 shadow-sm">
              <span className="text-rzp-navy font-semibold">Catalog Status:</span>
              <p className="mt-1 font-mono text-[11px] text-gray-500">
                Sanitized (Proxy On) · {catalog.length} SKUs
              </p>
            </div>

            {/* Search box */}
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search by name, SKU, or keyword…"
              className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rzp-blue focus:ring-1 focus:ring-rzp-blue shadow-sm"
            />

            {/* Match count */}
            <p className="text-[10px] text-gray-400 font-mono">
              {search ? `${filtered.length} matches` : `Showing ${visible.length} of ${catalog.length}`}
              {totalPages > 1 && ` · page ${page + 1}/${totalPages}`}
            </p>
          </>
        )}

        {/* SKU cards — only PAGE_SIZE items rendered at once */}
        {!loading &&
          !error &&
          visible.map((item) => (
            <div
              key={item.sku}
              className="bg-white border border-gray-200 p-2.5 rounded-lg shadow-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-800 truncate mr-2">
                  {item.name}
                </span>
                <span className="text-[10px] font-mono text-rzp-blue bg-blue-50 px-1.5 py-0.5 rounded shrink-0 font-medium">
                  {item.sku}
                </span>
              </div>
              <p className="text-gray-500 text-[11px] mb-1.5 line-clamp-2">
                {item.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-rzp-success font-semibold text-[12px]">
                  {formatPrice(item.price_inr)}
                </span>
                <span
                  className={`font-mono text-[10px] ${
                    item.stock_available > 0 ? "text-gray-500" : "text-rzp-error"
                  }`}
                >
                  {item.stock_available > 0
                    ? `${item.stock_available} in stock`
                    : "OUT OF STOCK"}
                </span>
              </div>
            </div>
          ))}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex gap-2 pt-1 pb-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex-1 py-1 text-[10px] font-mono bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex-1 py-1 text-[10px] font-mono bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
