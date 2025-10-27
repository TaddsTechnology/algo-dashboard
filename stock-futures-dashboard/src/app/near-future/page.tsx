"use client";

import { useEffect, useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";

type Contract = {
  symbol: string;
  expiry: string;
  days_to_expiry: number;
  lotSize?: number;
  lot_size?: number; // backward compatibility
  scripCode?: number | string;
  scrip_code?: number | string; // backward compatibility
  category: "current" | "near" | "far";
};

type ApiResponse = {
  success: boolean;
  data?: {
    current: Contract[];
    near: Contract[];
    far: Contract[];
  };
  summary?: {
    current: number;
    near: number;
    far: number;
    total: number;
  };
  token_info?: any;
  error?: string;
};

function formatHeaderLine(title: string) {
  const now = new Date();
  const ts = now.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).replace(/\//g, "-");
  return `${title} - ${ts}`;
}

function pad(value: string | number, width: number, align: "left" | "right" = "left") {
  const s = String(value ?? "");
  if (s.length >= width) return s.slice(0, width);
  const padChar = " ";
  if (align === "right") return padChar.repeat(width - s.length) + s;
  return s + padChar.repeat(width - s.length);
}

function renderTable(contracts: Contract[], heading: string) {
  const rows: string[] = [];
  rows.push(heading);
  rows.push("".padEnd(100, "-"));
  rows.push(
    `${pad("Symbol", 15)}  ${pad("Price", 10, "right")}  ${pad("Change%", 8, "right")}  ${pad("Bid", 10, "right")}  ${pad("Ask", 10, "right")}  ${pad("Lot", 8, "right")}  ${pad("Expiry", 12)}`
  );
  rows.push("".padEnd(100, "-") );

  // We only have static fields (ltp/bid/ask not in this API), show zeros as in sample
  for (const c of contracts) {
    const lot = (c.lotSize ?? c.lot_size ?? 0);
    rows.push(
      `${pad(c.symbol, 15)}  ${pad("0.00", 10, "right")}  ${pad("0.00%", 8, "right")}  ${pad("0.00", 10, "right")}  ${pad("0.00", 10, "right")}  ${pad((Number(lot) || 0).toLocaleString(), 8, "right")}  ${pad(c.expiry || "", 12)}`
    );
  }
  return rows.join("\n");
}

export default function NearFuturePage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function load() {
    try {
      setLoading(true);
      // Prefer direct Sharekhan categorization via Next route (no Flask)
      const query = new URLSearchParams();
      // If you set SHAREKHAN_ACCESS_TOKEN in env, you don't need to pass it here.
      // query.set('accessToken', '<OPTIONAL_RUNTIME_TOKEN>');
      const res = await fetch(`/api/sharekhan/near-future?${query.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResponse;
      if (!json.success) {
        setError(json.error || "Failed to load data");
      } else {
        setData(json);
        setError(null);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const textBlock = useMemo(() => {
    if (!data?.success || !data.data) return "";
    const current = (data.data as any).current || [];
    const near = (data.data as any).near || [];
    const far = (data.data as any).far || [];

    const header = `🔥 Current FUTURE`;
    const countLine = `📊 Showing ${current.length} contracts near expiry`;

    const currentTable = renderTable(current, "");

    const summary = [
      `   ${far[0]?.expiry || "Far"}      : ${far.length} contracts | Examples: ${far.slice(0,3).map(c=>c.symbol).join(", ")}`,
      `   ${near[0]?.expiry || "Near"}      : ${near.length} contracts | Examples: ${near.slice(0,3).map(c=>c.symbol).join(", ")}`,
      `   ${current[0]?.expiry || "Current"}`,
      `3 expirt current is ${current[0]?.expiry || ""}`
    ].join("\n");

    return [header, countLine, currentTable, summary].join("\n");
  }, [data]);

  return (
    <div className="min-h-screen bg-white p-6">
      <h1 className="text-2xl font-bold mb-2">Near Future</h1>
      <p className="text-sm text-gray-600 mb-4">Streaming via Flask → Next API proxy. Auto-refresh every 30s.</p>
      <Separator className="my-4" />
      {loading && <div className="text-gray-500">Loading...</div>}
      {error && (
        <div className="text-red-600 text-sm mb-3">{error}</div>
      )}
      <pre className="bg-black text-green-200 text-sm p-4 rounded overflow-auto whitespace-pre leading-5">
{textBlock}
      </pre>
    </div>
  );
}


