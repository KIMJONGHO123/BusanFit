import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('mobile map uses the backend TMAP car route endpoint contract', async () => {
  const tmapSource = await readFile(new URL('../src/api/tmap.ts', import.meta.url), 'utf8');
  const routeSegmentSource = await readFile(
    new URL('../src/features/planner/route-segments.ts', import.meta.url),
    'utf8',
  );

  assert.match(tmapSource, /post<CarRouteResponse>\('\/api\/tmap\/car-route'/);
  assert.match(tmapSource, /totalTimeMinutes: number/);
  assert.match(tmapSource, /totalDistanceMeters: number/);
  assert.match(tmapSource, /coordinates: RouteCoordinate\[\]/);
  assert.match(routeSegmentSource, /startLatitude: from\.latitude/);
  assert.match(routeSegmentSource, /endLongitude: to\.longitude/);
  assert.match(routeSegmentSource, /status: 'failed' as const/);
});

test('planner map passes route data to the TMAP WebView without Google Maps', async () => {
  const mapSource = await readFile(new URL('../src/app/planner/map.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(mapSource, /react-native-maps|PROVIDER_GOOGLE/);
  assert.match(mapSource, /<TmapView data=\{mapData\}/);
  assert.match(mapSource, /coordinates: segment\.coordinates/);
  assert.match(mapSource, /order: place\.order/);
});
