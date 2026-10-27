import { test, expect } from '@playwright/test'
import { createRouteMapDocument, routeMapData, serializeMapData } from '../src/features/diagnosis/route-map'
import { initialTrip, newStop } from '../src/features/planner/planner'
import { diagnosisFixture, fixturePlace, unknownDiagnosis } from './diagnosis-fixtures'
import { diagnose, login, openPlanner } from './diagnosis-helpers'
import { routeLegFixture } from './route-leg-fixtures'
import AxeBuilder from '@axe-core/playwright'

const snapshot = { trip: initialTrip, stops: [newStop(fixturePlace), newStop({ ...fixturePlace, name: '두 번째 장소' }), newStop({ ...fixturePlace, name: '세 번째 장소' })] }
const mapFrame = 'iframe[title="일정 경로 지도"]'

test('map preserves exact snapshot coordinates and does not bridge unknown segments', () => {
  const first = diagnosisFixture().schedule.segments[0]
  const last = { ...first, segmentId: 'segment-2', route: { ...first.route, value: { ...first.route.value!, coordinates: [{ latitude: 35.2, longitude: 129.1 }, { latitude: 35.3, longitude: 129.2 }] } } }
  const missing = { ...first, segmentId: 'segment-1', route: { ...first.route, value: null, limitation: '미확인' } }
  const data = routeMapData([first, missing, last], snapshot)
  expect(data.segments).toEqual([{ id: 'segment-0', coordinates: first.route.value!.coordinates }, { id: 'segment-2', coordinates: last.route.value.coordinates }])
  expect(data.places.map((p) => [p.order, p.name])).toEqual([[0, '부산역'], [1, fixturePlace.name], [2, '두 번째 장소'], [3, '세 번째 장소']])
  expect(data.places[2]).toMatchObject(last.route.value.coordinates[0])
  expect(data.legs.map((leg) => leg.seconds)).toEqual([first.route.value!.seconds, null, last.route.value.seconds])
  expect(data.legs[2]).toMatchObject({ order: 3, fromName: '두 번째 장소', toName: '세 번째 장소' })
  expect(routeMapData(unknownDiagnosis().schedule.segments, snapshot)).toMatchObject({ places: [], segments: [], legs: [{ seconds: null }] })
})

test('untrusted place names cannot escape the map document or marker label', () => {
  const name = '</script><script>parent.alert(1)</script><img src=x onerror=alert(2)>\u2028\u2029'
  const data = routeMapData(diagnosisFixture().schedule.segments, { trip: { ...initialTrip, departure: { ...initialTrip.departure, name } }, stops: snapshot.stops })
  const serialized = serializeMapData(data)
  expect(serialized).not.toContain('<')
  expect(serialized).not.toContain('\u2028')
  expect(JSON.parse(serialized)).toEqual(data)
  const doc = createRouteMapDocument('test-key"<', data)
  expect(doc).not.toContain(name)
  expect(doc).toContain('test-key%22%3C')
})

test('map draws server geometry, supports zoom and reset, and refreshes on rediagnosis', async ({ page }) => {
  await diagnose(page)
  const frame = page.frameLocator(mapFrame)
  await expect(frame.locator('.place-label')).toHaveCount(2)
  const read = () => frame.locator('body').evaluate(() => (window as unknown as { mapCalls: { paths: unknown[]; markers: unknown[]; bounds: unknown[]; zoom: number } }).mapCalls)
  expect((await read()).paths).toEqual([diagnosisFixture().schedule.segments[0].route.value!.coordinates])
  await page.getByLabel('이동 구간 선택', { exact: true }).selectOption('segment-0')
  await expect(page.getByTestId('route-leg-duration')).toHaveText('15분 17초')
  await frame.getByRole('button', { name: '지도 확대', exact: true }).click()
  expect((await read()).zoom).toBe(13)
  await frame.getByRole('button', { name: '지도 축소', exact: true }).click()
  expect((await read()).zoom).toBe(12)
  const count = (await read()).bounds.length
  await frame.getByRole('button', { name: '전체 경로', exact: true }).click()
  expect((await read()).bounds.length).toBe(count + 1)
  await page.getByRole('button', { name: '일정 수정하기', exact: true }).click()
  const next = diagnosisFixture({ diagnosisId: 'synthetic-new-map' })
  next.schedule.segments[0].route.value!.coordinates[0] = { latitude: 35.15, longitude: 129.05 }
  next.schedule.segments[0].route.value!.seconds = 61
  next.schedule.totalTravelSeconds = 61; next.schedule.requiredSeconds = 6061; next.schedule.remainingSeconds = 4739
  next.schedule.stops[0].arrival = next.schedule.stops[0].stayStart = '2026-11-01T09:01:01+09:00'
  next.schedule.stops[0].departure = '2026-11-01T10:41:01+09:00'
  await page.route('**/api/v2/planner/diagnose', (route) => route.fulfill({ json: next }))
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await expect(frame.locator('.place-label')).toHaveCount(2)
  expect((await read()).paths).toEqual([next.schedule.segments[0].route.value!.coordinates])
  await expect(page.getByTestId('route-leg-duration')).toHaveCount(0)
  await expect(page.getByLabel('이동 구간 선택', { exact: true })).toHaveValue('')
  await page.getByLabel('이동 구간 선택', { exact: true }).selectOption('segment-0')
  await expect(page.getByTestId('route-leg-duration')).toHaveText('1분 1초')
})

test('SDK failure preserves verdict and retry reloads only the map', async ({ page }) => {
  await openPlanner(page)
  await page.context().route(/apis\.openapi\.sk\.com\/tmap\/jsv2/, (route) => route.abort())
  let calls = 0
  await page.route('**/api/v2/planner/diagnose', (route) => { calls++; return route.fulfill({ json: diagnosisFixture() }) })
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await login(page)
  await expect(page.getByRole('heading', { name: '지도를 불러오지 못했어요' })).toBeVisible()
  await expect(page.getByTestId('diagnosis-verdict')).toContainText('일부 확인')
  await page.getByLabel('이동 구간 선택', { exact: true }).selectOption('segment-0')
  await expect(page.getByTestId('route-leg-duration')).toHaveText('15분 17초')
  await page.context().unroute(/apis\.openapi\.sk\.com\/tmap\/jsv2/)
  const { stubMap } = await import('./map-fixtures')
  await stubMap(page)
  await page.getByRole('button', { name: '지도 다시 불러오기' }).click()
  await expect(page.frameLocator(mapFrame).locator('.place-label')).toHaveCount(2)
  await expect(page.getByRole('heading', { name: '지도를 불러오지 못했어요' })).toHaveCount(0)
  await expect(page.frameLocator(mapFrame).locator('.place-marker[data-order="1"]')).toHaveAttribute('data-selected', 'true')
  expect(calls).toBe(1)
})

test('marker and keyboard selection show one exact duration below the map without new diagnosis calls', async ({ page }) => {
  const { places, result } = routeLegFixture()
  let calls = 0
  await openPlanner(page, false, places)
  await page.getByLabel('종료시간', { exact: true }).fill('18:00')
  await page.route('**/api/v2/planner/diagnose', (route) => { calls++; return route.fulfill({ json: result }) })
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await login(page)
  const frame = page.frameLocator(mapFrame)
  await expect(page.locator('.route-map-message')).toHaveCount(0)
  await frame.locator('.place-marker[data-order="2"] .place-number').click()
  await expect(page.getByTestId('route-leg-duration')).toHaveText('1분 13초')
  await expect(page.locator('.route-leg-places')).toContainText(places[1].name)
  const styles = () => frame.locator('body').evaluate(() => (window as unknown as {mapCalls:{styles:{strokeWeight:number}[]}}).mapCalls.styles.map((s) => s.strokeWeight))
  await expect.poll(styles).toEqual([4, 8, 4])
  await page.getByLabel('이동 구간 선택', { exact: true }).selectOption('')
  const select = page.getByLabel('이동 구간 선택', { exact: true })
  await select.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
  await expect(page.getByTestId('route-leg-duration')).toHaveText('15분 17초')
  await expect.poll(styles).toEqual([8, 4, 4])
  await select.selectOption('segment-2')
  await expect(page.getByTestId('route-leg-duration')).toHaveText('2분 2초')
  await expect(page.locator('.route-leg-places')).toContainText(places[2].name)
  expect(calls).toBe(1)
  const mapBox = await page.locator(mapFrame).boundingBox(), panelBox = await page.locator('.route-leg-panel').boundingBox()
  expect(panelBox!.y - mapBox!.y - mapBox!.height).toBeGreaterThanOrEqual(12)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
})

test('unknown incoming leg shows unavailable while later confirmed leg keeps its exact time and separate geometry', async ({ page }) => {
  const { places, result } = routeLegFixture(true)
  await openPlanner(page, false, places)
  await page.getByLabel('종료시간', { exact: true }).fill('18:00')
  await page.route('**/api/v2/planner/diagnose', (route) => route.fulfill({ json: result }))
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await login(page)
  const frame = page.frameLocator(mapFrame)
  await expect(page.locator('.route-map-message')).toHaveCount(0)
  await frame.locator('.place-marker[data-order="2"] .place-number').click()
  await expect(page.getByTestId('route-leg-duration')).toHaveText('이동시간 확인 불가')
  await expect(page.getByTestId('diagnosis-verdict')).toContainText('아직 가능 여부를 판단할 수 없어요')
  await expect(page.getByTestId('verification-status')).toContainText('일부 확인')
  await page.getByLabel('이동 구간 선택', { exact: true }).selectOption('segment-2')
  await expect(page.getByTestId('route-leg-duration')).toHaveText('2분 2초')
  expect(await frame.locator('body').evaluate(() => (window as unknown as {mapCalls:{paths:unknown[]}}).mapCalls.paths)).toEqual([result.schedule.segments[0].route.value!.coordinates, result.schedule.segments[2].route.value!.coordinates])
})

test('real TMAP basemap loads with route and names on desktop and mobile', async ({ page }, info) => {
  test.skip(process.env.BUSANFIT_LIVE_MAP !== '1', 'Explicit enablement for real map SDK and tiles; diagnosis remains a fixture')
  test.setTimeout(60000)
  await openPlanner(page, true)
  await page.route('**/api/v2/planner/diagnose', (route) => route.fulfill({ json: diagnosisFixture() }))
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await login(page)
  const frame = page.frameLocator(mapFrame)
  await expect(frame.locator('.place-label')).toHaveCount(2, { timeout: 30000 })
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 25000 })
  await expect(page.getByRole('heading', { name: '지도를 불러오지 못했어요' })).toHaveCount(0)
  await expect.poll(() => frame.locator('#map img').evaluateAll((images) => images.filter((img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth >= 256).length), { timeout: 20000 }).toBeGreaterThan(0)
  await frame.getByRole('button', { name: '지도 확대', exact: true }).click()
  await frame.getByRole('button', { name: '전체 경로', exact: true }).click()
  await expect.poll(() => frame.locator('.place-label').evaluateAll((labels) => labels.every((label) => { const r = label.getBoundingClientRect(); return r.top > 0 && r.top < innerHeight && r.left > 0 && r.left < innerWidth }))).toBe(true)
  expect(await frame.locator('.place-label').evaluateAll((labels) => { const c = document.querySelector('.controls')!.getBoundingClientRect(); return labels.every((label) => { const r = label.getBoundingClientRect(); return r.right <= c.left || r.left >= c.right || r.bottom <= c.top || r.top >= c.bottom }) })).toBe(true)
  await expect.poll(() => frame.locator('#map img').evaluateAll((images) => { const visible = images.filter((img) => { const r = img.getBoundingClientRect(); return r.width >= 256 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight }); return visible.length > 0 && visible.every((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth >= 256) }), { timeout: 20000 }).toBe(true)
  await page.locator(mapFrame).scrollIntoViewIfNeeded()
  await page.locator('.route-map-shell').screenshot({ path: `test-results/${info.project.name}-route-map-detail-live.png` })
  const number = frame.locator('.place-marker[data-order="1"] .place-number')
  if (info.project.name === 'mobile') await number.tap(); else await number.click()
  await expect(page.getByTestId('route-leg-duration')).toHaveText('15분 17초')
  await expect(frame.locator('.place-marker[data-order="1"]')).toHaveAttribute('data-selected', 'true')
  await expect(frame.getByText(`1. ${fixturePlace.name}`, { exact: true })).toHaveCount(0)
  await page.locator('section[aria-labelledby="route-heading"]').screenshot({ path: `test-results/${info.project.name}-route-leg-live-sdk-fixture.png` })
  await page.screenshot({ path: `test-results/${info.project.name}-route-map-live.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
