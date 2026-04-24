// FlightAnimation — a small earth + plane animation for a trip leg.
//
// Usage:
//   import FlightAnimation from './FlightAnimation';
//   <FlightAnimation from="TLV" to="CDG" size={260} duration={3300} palette="dark" accent="#ffffff" showLabels={false} />
//
// Timeline (duration ms total):
//   0 .. 0.13    takeoff: plane scales + lifts from origin
//   0.13 .. 0.87 cruise: globe rotates so origin -> destination sweeps beneath;
//                        dotted great-circle arc draws on; plane follows the path
//   0.87 .. 1.0  landing: plane descends to destination marker
//
// All drawing is SVG; no WebGL, no external libs.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AIRPORTS } from './airports';
import { loadContinents } from './continentsLoader';

// ---------- math helpers ----------
const DEG = Math.PI / 180;

// Convert lon/lat to 3D unit sphere.
// Convention: +x = east, +y = north, +z = toward viewer (lon=0 faces viewer).
function lonLatTo3D(lon, lat) {
  const la = lat * DEG, lo = lon * DEG;
  return [
    Math.sin(lo) * Math.cos(la),
    Math.sin(la),
    Math.cos(lo) * Math.cos(la),
  ];
}

function rotateY(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]];
}
function rotateX(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0], c * p[1] - s * p[2], s * p[1] + c * p[2]];
}

function project(p, cx, cy, r) {
  return { x: cx + p[0] * r, y: cy - p[1] * r, z: p[2] };
}

function slerp(a, b, t) {
  const dot = Math.max(-1, Math.min(1, a[0]*b[0] + a[1]*b[1] + a[2]*b[2]));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return a.slice();
  const s = Math.sin(omega);
  const wa = Math.sin((1 - t) * omega) / s;
  const wb = Math.sin(t * omega) / s;
  return [a[0]*wa + b[0]*wb, a[1]*wa + b[1]*wb, a[2]*wa + b[2]*wb];
}

const easeInOut = (t) => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t;

function continentPaths(continents, rotLon, rotLat, cx, cy, r) {
  const paths = [];
  for (const poly of continents) {
    let current = "";
    let inVisible = false;
    for (let i = 0; i < poly.length; i++) {
      const [lon, lat] = poly[i];
      let p = lonLatTo3D(lon, lat);
      p = rotateY(p, rotLon);
      p = rotateX(p, rotLat);
      const pr = project(p, cx, cy, r);
      if (pr.z > -0.02) {
        const x = pr.x, y = pr.y;
        if (!inVisible) {
          current += `M${x.toFixed(1)},${y.toFixed(1)} `;
          inVisible = true;
        } else {
          current += `L${x.toFixed(1)},${y.toFixed(1)} `;
        }
      } else {
        if (inVisible) current += "Z ";
        inVisible = false;
      }
    }
    if (inVisible) current += "Z";
    if (current.trim()) paths.push(current);
  }
  return paths;
}

// ---------- component ----------
export default function FlightAnimation({
  from = "TLV",
  to = "CDG",
  size = 260,
  accent = "#ffffff",
  duration = 3300,
  showLabels = false,
  autoplay = true,
  palette = "dark",
}) {
  const A = AIRPORTS[from];
  const B = AIRPORTS[to];
  if (!A || !B) return <div style={{fontSize:12,color:'#888'}}>Unknown airport: {from} / {to}</div>;

  const W = size;
  const H = Math.round(size * 0.62);
  const globeR = Math.min(W, H) * 0.36;
  const cx = W / 2;
  const cy = H * 0.56;

  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [continents, setContinents] = useState(null);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    let alive = true;
    loadContinents().then(c => { if (alive) setContinents(c); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!playing) return;
    startTimeRef.current = null;
    const tick = (now) => {
      if (startTimeRef.current == null) startTimeRef.current = now;
      const t = Math.min(1, (now - startTimeRef.current) / duration);
      setProgress(t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, duration]);

  const replay = () => {
    setProgress(0);
    setPlaying(false);
    requestAnimationFrame(() => setPlaying(true));
  };

  const TAKEOFF_END = 0.13;
  const CRUISE_END  = 0.87;

  const rot = useMemo(() => {
    const a3 = lonLatTo3D(A.lon, A.lat);
    const b3 = lonLatTo3D(B.lon, B.lat);
    const rotLonForPoint = (p) => -Math.atan2(p[0], p[2]);
    return {
      A: { lon: rotLonForPoint(a3), lat: 0 },
      B: { lon: rotLonForPoint(b3), lat: 0 },
      a3, b3,
    };
  }, [A.lon, A.lat, B.lon, B.lat]);

  let rotLon;
  const rotLat = 0;
  if (progress <= TAKEOFF_END) {
    rotLon = rot.A.lon;
  } else if (progress >= CRUISE_END) {
    rotLon = rot.B.lon;
  } else {
    const ct = (progress - TAKEOFF_END) / (CRUISE_END - TAKEOFF_END);
    const e = easeInOut(ct);
    let dlon = rot.B.lon - rot.A.lon;
    if (dlon > Math.PI) dlon -= 2 * Math.PI;
    if (dlon < -Math.PI) dlon += 2 * Math.PI;
    rotLon = rot.A.lon + dlon * e;
  }

  const paths = useMemo(
    () => continents ? continentPaths(continents, rotLon, rotLat, cx, cy, globeR) : [],
    [continents, rotLon, rotLat, cx, cy, globeR]
  );

  const projectPoint = (lon, lat) => {
    let p = lonLatTo3D(lon, lat);
    p = rotateY(p, rotLon);
    p = rotateX(p, rotLat);
    return project(p, cx, cy, globeR);
  };
  const pA = projectPoint(A.lon, A.lat);
  const pB = projectPoint(B.lon, B.lat);

  const arcPoints = useMemo(() => {
    const N = 48;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      pts.push(slerp(rot.a3, rot.b3, i / N));
    }
    return pts;
  }, [rot.a3, rot.b3]);

  const projectedArc = arcPoints.map(p => {
    let q = rotateY(p, rotLon);
    q = rotateX(q, rotLat);
    return project(q, cx, cy, globeR);
  });

  const arcReveal = Math.max(0, Math.min(1,
    (progress - TAKEOFF_END * 0.6) / (CRUISE_END - TAKEOFF_END * 0.6)
  ));
  const arcCount = Math.floor(projectedArc.length * arcReveal);

  let planeX, planeY, planeLift, planeScale, planeAngle, planeVisible = true;

  const bearingFromArc = (i) => {
    const a = projectedArc[Math.max(0, i - 1)];
    const b = projectedArc[Math.min(projectedArc.length - 1, i + 1)];
    return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 90;
  };

  if (progress <= TAKEOFF_END) {
    const t = easeOut(progress / TAKEOFF_END);
    planeX = pA.x;
    planeY = pA.y;
    planeLift = 8 * t;
    planeScale = 0.4 + 0.6 * t;
    planeAngle = bearingFromArc(0);
    planeVisible = pA.z > -0.1;
  } else if (progress < CRUISE_END) {
    const ct = (progress - TAKEOFF_END) / (CRUISE_END - TAKEOFF_END);
    const arcIdx = Math.floor(ct * (projectedArc.length - 1));
    const p = projectedArc[arcIdx];
    planeX = p.x;
    planeY = p.y;
    planeLift = 10;
    planeScale = 1;
    planeAngle = bearingFromArc(arcIdx);
    planeVisible = p.z > -0.1;
  } else {
    const t = easeIn((progress - CRUISE_END) / (1 - CRUISE_END));
    planeX = pB.x;
    planeY = pB.y;
    planeLift = 10 * (1 - t);
    planeScale = 1 - 0.5 * t;
    planeAngle = bearingFromArc(projectedArc.length - 1);
    planeVisible = pB.z > -0.1;
  }

  const palettes = {
    cool:    { bg: "#f8fafc", ocean: "#e2e8f0", land: "#cbd5e1", grid: "#cbd5e1", text: "#0f172a", sub: "#64748b" },
    warm:    { bg: "#fbf7f1", ocean: "#ede3d4", land: "#c9a789", grid: "#d9c5ab", text: "#2a1e14", sub: "#8a6d4f" },
    mono:    { bg: "#ffffff", ocean: "#eeeeee", land: "#cccccc", grid: "#dddddd", text: "#111111", sub: "#666666" },
    vintage: { bg: "#f4ecd8", ocean: "#e6d9b8", land: "#b89a6b", grid: "#c9b688", text: "#3a2a1a", sub: "#8a6d4f" },
    dark:    { bg: "transparent", ocean: "rgba(96,165,250,0.10)", land: "rgba(148,163,184,0.55)", grid: "rgba(148,163,184,0.20)", text: "#e2e8f0", sub: "#94a3b8" },
    // 'white' — transparent background so the animation blends into the parent card surface (#fff)
    white:   { bg: "transparent", ocean: "#eef4ff", land: "#cdd9ec", grid: "#dbe4f4", text: "#0f1a2e", sub: "#64748b" },
    // 'light' — kept as alias to 'white' for backward compatibility
    light:   { bg: "transparent", ocean: "#eef4ff", land: "#cdd9ec", grid: "#dbe4f4", text: "#0f1a2e", sub: "#64748b" },
  };
  const C = palettes[palette] || palettes.cool;

  // Unique clipPath / gradient IDs so multiple instances on one page don't collide
  const uid = `${from}-${to}-${useMemo(() => Math.random().toString(36).slice(2, 7), [])}`;

  return (
    <div
      className="flight-anim"
      onClick={replay}
      onMouseEnter={replay}
      dir="ltr"
      style={{
        width: W,
        cursor: "pointer",
        userSelect: "none",
        direction: "ltr",
        fontFamily: "'Open Sans Hebrew', 'Open Sans', system-ui, sans-serif",
      }}
    >
      {showLabels && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 4px 8px", fontSize: Math.max(10, W * 0.035),
          color: C.text, letterSpacing: "0.02em",
        }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: "'Open Sans Hebrew', 'Open Sans', system-ui, sans-serif", fontWeight: 700, fontSize: Math.max(12, W * 0.05), fontVariantNumeric: 'tabular-nums' }}>{from}</div>
            <div style={{ fontSize: Math.max(9, W * 0.03), color: C.sub, marginTop: 1 }}>{A.city}</div>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub }}>
            <div style={{ height: 1, background: C.sub, flex: 1, maxWidth: 24, opacity: 0.5 }} />
            <div style={{ margin: "0 8px", fontSize: Math.max(10, W * 0.035) }}>→</div>
            <div style={{ height: 1, background: C.sub, flex: 1, maxWidth: 24, opacity: 0.5 }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Open Sans Hebrew', 'Open Sans', system-ui, sans-serif", fontWeight: 700, fontSize: Math.max(12, W * 0.05), fontVariantNumeric: 'tabular-nums' }}>{to}</div>
            <div style={{ fontSize: Math.max(9, W * 0.03), color: C.sub, marginTop: 1 }}>{B.city}</div>
          </div>
        </div>
      )}

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: C.bg, borderRadius: 8 }}>
        <defs>
          <clipPath id={`globe-clip-${uid}`}>
            <circle cx={cx} cy={cy} r={globeR} />
          </clipPath>
          <radialGradient id={`ocean-grad-${uid}`} cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor={C.ocean} stopOpacity="1" />
            <stop offset="100%" stopColor={C.ocean} stopOpacity="0.7" />
          </radialGradient>
        </defs>

        <circle cx={cx} cy={cy} r={globeR} fill={`url(#ocean-grad-${uid})`} />

        <g clipPath={`url(#globe-clip-${uid})`} stroke={C.grid} strokeWidth="0.5" fill="none" opacity="0.6">
          {[-60, -30, 0, 30, 60].map(lat => {
            const pts = [];
            for (let lon = -180; lon <= 180; lon += 10) {
              let p = lonLatTo3D(lon, lat);
              p = rotateY(p, rotLon);
              p = rotateX(p, rotLat);
              if (p[2] > 0) pts.push(project(p, cx, cy, globeR));
            }
            if (pts.length < 2) return null;
            return <polyline key={`lat${lat}`} points={pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} />;
          })}
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(lon => {
            const pts = [];
            for (let lat = -85; lat <= 85; lat += 5) {
              let p = lonLatTo3D(lon, lat);
              p = rotateY(p, rotLon);
              p = rotateX(p, rotLat);
              if (p[2] > 0) pts.push(project(p, cx, cy, globeR));
            }
            if (pts.length < 2) return null;
            return <polyline key={`lon${lon}`} points={pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} />;
          })}
        </g>

        <g clipPath={`url(#globe-clip-${uid})`}>
          {paths.map((d, i) => (
            <path key={i} d={d} fill={C.land} stroke={C.land} strokeWidth="0.5" strokeLinejoin="round" />
          ))}
        </g>

        <circle cx={cx} cy={cy} r={globeR} fill="none" stroke={C.text} strokeWidth="1" opacity="0.15" />

        <g clipPath={`url(#globe-clip-${uid})`}>
          {projectedArc.slice(0, arcCount).map((p, i) => {
            if (p.z <= 0) return null;
            if (i % 2 !== 0) return null;
            return <circle key={i} cx={p.x} cy={p.y} r={1.4} fill={accent} opacity={0.85} />;
          })}
        </g>

        {pA.z > 0 && (
          <g>
            <circle cx={pA.x} cy={pA.y} r={3.5} fill={accent} opacity="0.25" />
            <circle cx={pA.x} cy={pA.y} r={1.8} fill={accent} />
          </g>
        )}
        {pB.z > 0 && (
          <g>
            <circle cx={pB.x} cy={pB.y} r={3.5} fill={accent} opacity={progress > CRUISE_END ? 0.4 : 0.25} />
            <circle cx={pB.x} cy={pB.y} r={1.8} fill={accent} />
            {progress > CRUISE_END - 0.1 && (
              <circle cx={pB.x} cy={pB.y} r={3.5 + (1 - (1 - progress) * 10) * 6}
                fill="none" stroke={accent} strokeWidth="1"
                opacity={Math.max(0, 1 - (progress - (CRUISE_END - 0.1)) * 5)} />
            )}
          </g>
        )}

        {planeVisible && (
          <g transform={`translate(${planeX}, ${planeY - planeLift}) rotate(${planeAngle}) scale(${planeScale})`}>
            <ellipse cx="0" cy={planeLift * 0.8} rx={6 * planeScale} ry={1.5} fill={C.text} opacity={0.15} />
            <g fill={C.text}>
              <path d="M0,-8 L1.3,-2 L1.3,4 L2.5,6 L2.5,7 L0.8,6.5 L0.8,8 L-0.8,8 L-0.8,6.5 L-2.5,7 L-2.5,6 L-1.3,4 L-1.3,-2 Z" />
              <path d="M-9,1 L-1.3,-1 L-1.3,3 L-9,4 Z" />
              <path d="M9,1 L1.3,-1 L1.3,3 L9,4 Z" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
