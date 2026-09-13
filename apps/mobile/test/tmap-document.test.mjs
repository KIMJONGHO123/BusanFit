import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { test } from 'node:test';
import assert from 'node:assert/strict';

function loadTypeScript(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: (name) => dependencies[name] });
  return exports;
}

const { createTmapDocument, serializeMapData } = loadTypeScript('../src/features/planner/tmap-document.ts');

function createHarness() {
  const messages = [], lines = [], markers = [], removed = [], bounds = [];
  const Tmapv2 = {
    Map: class { fitBounds(value) { bounds.push(value); } setCenter() {} setZoom() {} },
    LatLng: class { constructor(latitude, longitude) { Object.assign(this, { latitude, longitude }); } },
    LatLngBounds: class { constructor(sw, ne) { Object.assign(this, { sw, ne }); } },
    Size: class {},
    Polyline: class { constructor(options) { lines.push(options); } setMap(map) { removed.push(map); } },
    Marker: class { constructor(options) { markers.push(options); } setMap(map) { removed.push(map); } },
  };
  const window = { Tmapv2, addEventListener() {}, ReactNativeWebView: { postMessage: (value) => messages.push(JSON.parse(value)) } };
  const context = vm.createContext({ window, Tmapv2, setTimeout: () => 1, clearTimeout() {}, document: {

  } });
  const html = createTmapDocument('client-key');
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  return { context, window, messages, lines, markers, removed, bounds };
}

test('TMAP receives separate road polylines, numbered markers, and bounds covering all stops', () => {
  const h = createHarness();
  h.window.initializeTmap();
  const data = {
    places: [{ latitude: 35.1, longitude: 129.1, order: 1, name: '<img src=x onerror=alert(1)>' }, { latitude: 35.2, longitude: 129.2, order: 2, name: '해운대' }],
    segments: [{ order: 1, coordinates: [{ latitude: 35.1, longitude: 129.1 }, { latitude: 35.15, longitude: 129.13 }] }, { order: 2, coordinates: [{ latitude: 35.18, longitude: 129.17 }, { latitude: 35.2, longitude: 129.2 }] }],
  };
  h.window.setSchedule(data);
  assert.equal(h.lines.length, 2);
  assert.equal(h.markers.length, 2);
  assert.equal(h.lines[0].path[1].latitude, 35.15);
  assert.equal(h.lines[0].path[1].longitude, 129.13);
  assert.notEqual(h.lines[0].strokeColor, h.lines[1].strokeColor);
  assert.ok(h.bounds[0].sw.latitude < 35.1 && h.bounds[0].ne.latitude > 35.2);
  assert.doesNotMatch(h.markers[0].label, /<img/);
  assert.match(decodeURIComponent(h.markers[0].icon), />1<\/text>/);
  h.window.setSchedule({ places: [], segments: [] });
  assert.equal(h.removed.length, 4, 'old overlays must be removed when the itinerary changes');
  assert.deepEqual(h.messages.map((message) => message.type), ['ready', 'rendered', 'rendered']);
});

test('script injection cannot break out of HTML or execute place names', () => {
  const dangerous = '</script><script>throw new Error("injected")</script>\u2028';
  assert.ok(!serializeMapData({ name: dangerous }).includes('<'));
  assert.equal(JSON.parse(serializeMapData({ name: dangerous })).name, dangerous);
  assert.equal((createTmapDocument(dangerous).match(/<\/script>/g) ?? []).length, 3);
});

test('SDK failure reports an error without leaking the SDK key', () => {
  const h = createHarness();
  h.window.tmapLoadFailed();
  h.window.tmapLoadFailed();
  assert.deepEqual(h.messages, [{ type: 'error' }]);
  assert.doesNotMatch(JSON.stringify(h.messages), /client-key/);
});

test('missing or invalid route geometry is not reported as a successful segment', async () => {
  const routeApi = { getCarRoute: async () => ({ totalDistanceMeters: 1000, totalTimeSeconds: 100, totalTimeMinutes: 2, coordinates: [] }), getRouteErrorMessage: () => 'failed' };
  const { fetchScheduleRouteSegments } = loadTypeScript('../src/features/planner/route-segments.ts', { '@/api/tmap': routeApi });
  const places = [{ placeId: 'a', order: 1, name: 'A', latitude: 35.1, longitude: 129.1 }, { placeId: 'b', order: 2, name: 'B', latitude: 35.2, longitude: 129.2 }];
  assert.equal((await fetchScheduleRouteSegments(places))[0].status, 'failed');
  routeApi.getCarRoute = async () => ({ coordinates: [{ latitude: 129, longitude: 35 }, { latitude: 35, longitude: 129 }] });
  assert.equal((await fetchScheduleRouteSegments(places))[0].status, 'failed');
  routeApi.getCarRoute = async () => ({ totalTimeSeconds: 100, totalDistanceMeters: 1000, coordinates: places });
  assert.equal((await fetchScheduleRouteSegments(places))[0].status, 'success');
});

test('SDK bootstrap is parser-blocking so document.write can load its dependencies', () => {
 const html=createTmapDocument('client-key');
 assert.match(html, /<script src="https:\/\/apis\.openapi\.sk\.com\/tmap\/jsv2[^>]+><\/script>\s*<script>window\.initializeTmap\(\);/);
 assert.doesNotMatch(html, /document\.createElement\('script'\)/);
});
