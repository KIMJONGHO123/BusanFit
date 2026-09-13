import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { test } from 'node:test';
import assert from 'node:assert/strict';

function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: (name) => dependencies[name] });
  return exports;
}
const activities = load('../src/features/planner/activities.ts');
const { diagnoseSchedule, formatDuration } = load('../src/features/planner/diagnose.ts', { './activities': activities });
const condition = { travelDate: '2026-09-13', startTime: '10:00', endTime: '12:00', departureName: '부산역', departureLatitude: 35.1151, departureLongitude: 129.0414 };
const places = [
  { placeId: 'a', name: 'A', order: 1, latitude: 35.15, longitude: 129.12, stayMinutes: 20, activities: [{ id: 'photo', name: '사진', minutes: 20 }] },
  { placeId: 'b', name: 'B', order: 2, latitude: 35.1, longitude: 129.01, stayMinutes: 30, activities: [] },
];
const api = { getCarRoute: async () => ({ totalTimeSeconds: 901, totalTimeMinutes: 16, totalDistanceMeters: 1000, coordinates: places }), getRouteErrorMessage: () => '경로 조회 실패' };
const routes = load('../src/features/planner/route-segments.ts', { '@/api/tmap': api });

test('departure is the first endpoint and one stop still requests one route', async () => {
  const departure = routes.getDeparture(condition);
  const legs = routes.buildScheduleRouteLegs([...places].reverse(), departure);
  assert.equal(legs.length, 2);
  assert.equal(legs[0].from.name, '부산역');
  assert.equal(legs[0].to.placeId, 'a');
  assert.equal(legs[1].from.placeId, 'a');
  const segments = await routes.fetchScheduleRouteSegments([places[0]], departure);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].status, 'success');
  assert.equal(routes.getDeparture({ ...condition, departureLatitude: undefined }), null);
});

test('diagnosis uses the same seconds as map totals including first leg and activities', async () => {
  const segments = await routes.fetchScheduleRouteSegments(places, routes.getDeparture(condition));
  const diagnosis = diagnoseSchedule(condition, places, segments);
  assert.equal(diagnosis.schedule[0].arrivalTime, '10:15:01');
  assert.equal(diagnosis.schedule[0].departureTime, '10:55:01');
  assert.equal(diagnosis.schedule[1].arrivalTime, '11:10:02');
  assert.equal(diagnosis.schedule[1].departureTime, '11:40:02');
  assert.equal(Math.round(diagnosis.requiredMinutes * 60), 6002);
  assert.equal(formatDuration(diagnosis.remainingMinutes), '19분 58초');
  assert.equal(Math.round(diagnosis.schedule.reduce((sum, stop) => sum + stop.travelMinutesFromPrevious, 0) * 60), segments.reduce((sum, segment) => sum + segment.totalTimeSeconds, 0));
});

test('one second over deadline fails and crossing midnight is labelled', async () => {
  const segments = await routes.fetchScheduleRouteSegments([places[0]], routes.getDeparture(condition));
  assert.equal(diagnoseSchedule({ ...condition, endTime: '10:55' }, [places[0]], segments).feasible, false);
  assert.equal(diagnoseSchedule({ ...condition, startTime: '23:30', endTime: '23:59' }, [places[0]], segments).schedule[0].departureTime, '다음 날 00:25:01');
});

test('missing, failed or out-of-order legs cannot produce a feasibility result', async () => {
  const segments = await routes.fetchScheduleRouteSegments(places, routes.getDeparture(condition));
  assert.throws(() => diagnoseSchedule(condition, places, segments.slice(1)));
  assert.throws(() => diagnoseSchedule(condition, places, [...segments].reverse()));
  assert.throws(() => diagnoseSchedule(condition, places, [{ ...segments[0], status: 'failed' }, segments[1]]));
  assert.throws(() => diagnoseSchedule({ ...condition, endTime: '09:00' }, places, segments));
});

test('both screens share cached routes while activity edits preserve the route key', () => {
  const { useScheduleRoutes } = load('../src/features/planner/use-schedule-routes.ts', { '@tanstack/react-query': { useQuery: (options) => options }, './route-segments': routes });
  const first = useScheduleRoutes(condition, places);
  const changedActivity = useScheduleRoutes(condition, places.map((place) => ({ ...place, activities: [] })));
  assert.equal(JSON.stringify(first.queryKey), JSON.stringify(changedActivity.queryKey));
  assert.equal(first.staleTime, Infinity);
  assert.notEqual(JSON.stringify(first.queryKey), JSON.stringify(useScheduleRoutes({ ...condition, departureLatitude: 35.2 }, places).queryKey));
  assert.notEqual(JSON.stringify(first.queryKey), JSON.stringify(useScheduleRoutes(condition, places.map((place) => ({ ...place, order: 3 - place.order }))).queryKey));
});
