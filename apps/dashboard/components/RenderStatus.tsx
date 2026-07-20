"use client";

import { useEffect, useState } from "react";

interface RenderJobState {
  status: "QUEUED" | "RUNNING" | "DONE" | "FAILED";
  progress: number;
  outputUrl: string | null;
  thumbnailUrl: string | null;
  error: string | null;
}

const POLL_INTERVAL_MS = 3000;

export function RenderStatus({ renderJobId, initial }: { renderJobId: string; initial: RenderJobState }) {
  const [state, setState] = useState(initial);

  useEffect(() => {
    if (state.status !== "QUEUED" && state.status !== "RUNNING") return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/render-jobs/${renderJobId}`, { cache: "no-store" });
      if (res.ok) setState(await res.json());
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [state.status, renderJobId]);

  return (
    <div className="rounded-lg border border-white/10 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Render status:</span>
        <span className="text-sm">{state.status}</span>
        {state.status === "RUNNING" && (
          <span className="text-sm text-white/50">{Math.round(state.progress * 100)}%</span>
        )}
      </div>
      {state.status === "RUNNING" && (
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${Math.round(state.progress * 100)}%` }} />
        </div>
      )}
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.outputUrl && <p className="text-sm text-white/60">Output: {state.outputUrl}</p>}
    </div>
  );
}
