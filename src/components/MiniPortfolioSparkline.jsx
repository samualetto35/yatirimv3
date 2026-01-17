import { useEffect, useMemo, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

const MiniPortfolioSparkline = ({ values, baseline = 100000 }) => {
  const containerRef = useRef(null);
  const uplotRef = useRef(null);

  const series = useMemo(() => {
    const arr = Array.isArray(values) ? values.map(Number).filter(v => Number.isFinite(v)) : [];
    return arr;
  }, [values]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !series.length) return;

    const x = series.map((_, i) => i);
    const y = series;

    const last = Number(series[series.length - 1]);
    const delta = Number.isFinite(last) ? (last - baseline) : NaN;
    const line = delta > 0 ? '#22c55e' : (delta < 0 ? '#ef4444' : '#9ca3af');

    const width = Math.max(120, el.clientWidth || 120);
    const height = 46;

    const fill = (u) => {
      const ctx = u.ctx;
      const g = ctx.createLinearGradient(0, u.bbox.top, 0, u.bbox.top + u.bbox.height);
      const topAlpha = 0.18;
      const rgb = line === '#22c55e' ? '34,197,94' : (line === '#ef4444' ? '239,68,68' : '156,163,175');
      g.addColorStop(0, `rgba(${rgb},${topAlpha})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      return g;
    };

    const opts = {
      width,
      height,
      series: [
        { label: 'x' },
        { stroke: line, fill, width: 2, points: { show: false } },
      ],
      // Explicitly hide axes (prevents default ticks like 0/5/10)
      axes: [
        { show: false },
        { show: false },
      ],
      legend: { show: false },
      padding: [0, 0, 0, 0],
      scales: {
        x: { time: false },
        y: {
          auto: true,
          range: (u, min, max) => {
            const spread = Math.max(max - min, 1);
            const pad = spread * 0.12;
            return [min - pad, max + pad];
          },
        },
      },
      cursor: { show: false },
      select: { show: false },
    };

    if (uplotRef.current) {
      try { uplotRef.current.destroy(); } catch {}
      uplotRef.current = null;
    }

    const u = new uPlot(opts, [x, y], el);
    uplotRef.current = u;

    const ro = new ResizeObserver(() => {
      const w = Math.max(120, el.clientWidth || 120);
      u.setSize({ width: w, height });
    });
    ro.observe(el);

    return () => {
      try { ro.disconnect(); } catch {}
      try { u.destroy(); } catch {}
      uplotRef.current = null;
    };
  }, [series, baseline]);

  if (!series.length) return null;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        width: '100%',
        marginTop: 8,
        borderRadius: 12,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%)',
      }}
    />
  );
};

export default MiniPortfolioSparkline;

