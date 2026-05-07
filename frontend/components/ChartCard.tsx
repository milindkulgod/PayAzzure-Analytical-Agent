"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import type { ChartSpec } from "@/lib/api";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const darkLayout = {
  paper_bgcolor: "#141822",
  plot_bgcolor: "#141822",
  font: { color: "#e6e8ee" },
  margin: { t: 40, r: 20, b: 40, l: 50 },
};

export function ChartCard({ spec, index }: { spec: ChartSpec; index: number }) {
  const ref = useRef<any>(null);

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
    <div className="card p-3 my-3">
      <Plot
        ref={ref}
        data={spec.data}
        layout={{ ...darkLayout, ...spec.layout, autosize: true }}
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
