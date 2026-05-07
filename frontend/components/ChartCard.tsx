"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
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

export function ChartCard({ spec, index }: { spec: ChartSpec; index: number }) {
  const ref = useRef<any>(null);
  const theme = useTheme();
  const palette = PALETTES[theme];

  const themedLayout = {
    paper_bgcolor: palette.paper,
    plot_bgcolor: palette.paper,
    font: { color: palette.text },
    xaxis: { gridcolor: palette.grid, zerolinecolor: palette.grid, color: palette.text },
    yaxis: { gridcolor: palette.grid, zerolinecolor: palette.grid, color: palette.text },
    margin: { t: 40, r: 20, b: 40, l: 50 },
    ...spec.layout,
    autosize: true,
  };

  function download() {
    const gd = ref.current?.el;
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
    <div className="card p-3">
      <Plot
        ref={ref}
        data={spec.data}
        layout={themedLayout}
        useResizeHandler
        style={{ width: "100%", height: 400 }}
        config={{ displayModeBar: false, responsive: true }}
      />
      <div className="flex justify-end mt-2">
        <button className="btn-ghost text-xs" onClick={download}>
          Download PNG
        </button>
      </div>
    </div>
  );
}
