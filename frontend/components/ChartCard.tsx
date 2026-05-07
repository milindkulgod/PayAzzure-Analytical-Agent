"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChartSpec } from "@/lib/api";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const PALETTES = {
  dark: { paper: "#141822", text: "#e6e8ee", grid: "#222837" },
  light: { paper: "#ffffff", text: "#1a1d24", grid: "#e2e6ee" },
};

function readTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  const t = document.documentElement.getAttribute("data-theme");
  return t === "light" ? "light" : "dark";
}

function useTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    setTheme(readTheme());
    const obs = new MutationObserver(() => setTheme(readTheme()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);
  return theme;
}

function buildLayout(spec: ChartSpec, theme: "dark" | "light") {
  const palette = PALETTES[theme];
  return {
    paper_bgcolor: palette.paper,
    plot_bgcolor: palette.paper,
    font: { color: palette.text },
    xaxis: { gridcolor: palette.grid, zerolinecolor: palette.grid, color: palette.text },
    yaxis: { gridcolor: palette.grid, zerolinecolor: palette.grid, color: palette.text },
    margin: { t: 40, r: 20, b: 40, l: 50 },
    ...spec.layout,
    autosize: true,
  };
}

export function ChartCard({ spec, index }: { spec: ChartSpec; index: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<any>(null);
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const gd = plotRef.current?.el;
      if (!gd) return;
      import("plotly.js-dist-min").then((Plotly) => {
        try {
          Plotly.Plots.resize(gd);
        } catch {}
      });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function download() {
    const gd = plotRef.current?.el;
    if (!gd) return;
    import("plotly.js-dist-min").then((Plotly) => {
      Plotly.downloadImage(gd, {
        format: "png",
        filename: `chart-${index + 1}`,
        width: 1200,
        height: 700,
      });
    });
  }

  return (
    <>
      <div ref={containerRef} className="card chart-resizable flex flex-col gap-2 p-3">
        <div className="flex-1 min-h-0">
          <Plot
            ref={plotRef}
            data={spec.data}
            layout={buildLayout(spec, theme)}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
        <div className="flex justify-end gap-2 shrink-0">
          <button
            className="icon-btn-sm"
            onClick={() => setExpanded(true)}
            aria-label="Expand chart"
            title="Expand"
          >
            <ExpandIcon />
          </button>
          <button className="btn-ghost text-xs" onClick={download}>
            Download PNG
          </button>
        </div>
      </div>
      {expanded && <ChartModal spec={spec} theme={theme} onClose={() => setExpanded(false)} />}
    </>
  );
}

function ChartModal({
  spec,
  theme,
  onClose,
}: {
  spec: ChartSpec;
  theme: "dark" | "light";
  onClose: () => void;
}) {
  const plotRef = useRef<any>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="icon-btn modal-close"
          onClick={onClose}
          aria-label="Close"
          title="Close (Esc)"
        >
          <CloseIcon />
        </button>
        <div className="flex-1 min-h-0">
          <Plot
            ref={plotRef}
            data={spec.data}
            layout={buildLayout(spec, theme)}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ExpandIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9V3h6" />
      <path d="M21 9V3h-6" />
      <path d="M3 15v6h6" />
      <path d="M21 15v6h-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}
