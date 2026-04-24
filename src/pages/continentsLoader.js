// Loads real-world continent geometry from a CDN at runtime, once per page.
// Uses Natural Earth 110m land data via the world-atlas TopoJSON package.
// Returns a promise that resolves to an array of polygons — each polygon = [[lon,lat], ...].

let cache = null;
let pending = null;

// Tiny TopoJSON decoder — decodes "Polygon"/"MultiPolygon" geometries to GeoJSON coordinates.
function decodeTopo(topology) {
  const tx = topology.transform;
  const arcs = topology.arcs.map(arc => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return [
        x * tx.scale[0] + tx.translate[0],
        y * tx.scale[1] + tx.translate[1],
      ];
    });
  });

  function ringFromArcs(arcRefs) {
    const ring = [];
    for (const ref of arcRefs) {
      const idx = ref < 0 ? ~ref : ref;
      const arc = arcs[idx];
      const seg = ref < 0 ? arc.slice().reverse() : arc;
      if (ring.length > 0) ring.pop();
      for (const p of seg) ring.push(p);
    }
    return ring;
  }

  const polygons = [];
  const land = topology.objects.land;
  if (!land) return polygons;
  const geometries = land.type === 'GeometryCollection' ? land.geometries : [land];
  for (const geom of geometries) {
    if (geom.type === 'Polygon') {
      polygons.push(ringFromArcs(geom.arcs[0]));
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.arcs) {
        polygons.push(ringFromArcs(poly[0]));
      }
    }
  }
  return polygons;
}

export function loadContinents() {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;

  const urls = [
    'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json',
    'https://unpkg.com/world-atlas@2/land-110m.json',
  ];
  pending = (async () => {
    let lastErr;
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const topo = await res.json();
        cache = decodeTopo(topo);
        return cache;
      } catch (e) {
        lastErr = e;
      }
    }
    console.warn('Could not load continents; animation will show a plain sphere.', lastErr);
    cache = [];
    return cache;
  })();
  return pending;
}
