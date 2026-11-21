import { test, expect } from '@playwright/test'
import { parsePlaces } from '../src/features/places/places'
import { parseActivityPolicy } from '../src/features/planner/planner'
import type { Page } from '@playwright/test'

// Opt-in only: real running Spring Boot + DB + TourAPI credentials are required.
// No response interception or fixture fallback is used in this file.
test.skip(process.env.BUSANFIT_LIVE_TOURAPI !== '1', 'Requires explicitly enabled real TourAPI environment')

async function verifyDetail(page: Page, place: { id: string; name: string }) {
  const completed = page.waitForResponse(async res =>
    new URL(res.url()).pathname === `/api/places/${place.id}/detail` && await res.finished() === null)
  await page.getByRole('button', { name: `${place.name} 상세 보기`, exact: true }).click()
  const response = await completed
  expect(response.status()).toBe(200)
  const detail = await response.json()
  if (detail.status === 'NOT_COLLECTED' || detail.status === 'EMPTY') {
    const message = detail.status === 'NOT_COLLECTED'
      ? '아직 수집한 상세정보가 없습니다.' : '수집했지만 표시할 값이 없습니다.'
    await expect(page.getByRole('dialog').getByText(message, { exact: true })).toBeVisible()
    expect(detail.fields.filter((field: { text: string }) => field.text.trim())).toHaveLength(0)
    return []
  }
  expect(detail.status).toBe('AVAILABLE')
  const visible = detail.fields.filter((f: { text: string }) => f.text.trim())
  expect(visible.length).toBeGreaterThan(0)
  const rows = page.locator('dialog .visit-details div').filter({ has: page.locator('dd span') })
  await expect(rows).toHaveCount(visible.length)
  for (const [index, field] of visible.entries()) {
    const row = rows.nth(index)
    await expect(row.locator('dt')).toHaveText(field.label)
    await expect(row.locator('dd span')).toHaveText(field.text)
    await expect(row.locator('small').first()).toContainText(field.source)
    expect(Date.parse(field.checkedAt)).toBeGreaterThan(0)
    await expect(row.locator('time')).toHaveAttribute('datetime', field.checkedAt)
    const koreanTime = await page.evaluate((timestamp: string) =>
      new Date(timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }), field.checkedAt)
    await expect(row.locator('time')).toHaveText(`${koreanTime} 수집 (한국시간)`)
    await expect(row.getByText('출처별 안내가 다릅니다.', { exact: true })).toHaveCount(field.differs ? 1 : 0)
  }
  return visible.map((field: { source: string }) => field.source)
}

test('F1963 stored detail displays both real providers and their observation times', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').fill('F1963')
  await page.getByRole('textbox').press('Enter')
  const sources = await verifyDetail(page, { name: 'F1963', id: 'tourapi-2456767' })
  expect(sources).toEqual(expect.arrayContaining(['한국관광공사', '부산광역시']))
})

test('real TourAPI search, selection and itinerary editing preserve returned places', async ({ page }, info) => {
  test.setTimeout(90_000)
  let diagnosisRequests = 0
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/diagnose')) diagnosisRequests++
  })
  await page.goto('/')
  const searchResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/places/search')
  await page.getByRole('button', { name: '해운대', exact: true }).click()
  const response = await searchResponse
  expect(response.status()).toBe(200)
  const places = parsePlaces(await response.json())
  expect(places.length).toBeGreaterThan(0)
  for (const place of places) expect(place.id).toMatch(/^tourapi-\d+$/)
  const first = places[0]
  expect(first.name).toContain('해운대')
  expect(first.address).toContain('부산')
  await expect(page.locator('.place-list .place-row')).toHaveCount(places.length)
  await verifyDetail(page, first)
  await expect(page.getByRole('dialog')).toContainText(first.name)
  await expect(page.getByRole('dialog')).toContainText('근거 정보 없음')
  await page.getByRole('button', { name: '선택한 장소에 추가', exact: true }).click()
  await page.getByRole('button', { name: '장소 정보 닫기' }).click()
  await page.screenshot({ path: `test-results/${info.project.name}-tourapi-live-search.png`, fullPage: true })

  // React StrictMode cancels its first effect request in development.
  // Only inspect the completed request that actually supplies the UI policy.
  const policyResponse = page.waitForResponse(async (res) =>
    new URL(res.url()).pathname === '/api/planner/activity-policy' && await res.finished() === null)
  await page.getByRole('button', { name: '순서·시간 설정', exact: true }).click()
  const policyRes = await policyResponse
  expect(policyRes.status()).toBe(200)
  const policy = parseActivityPolicy(await policyRes.json())
  const cafe = policy.find((item) => item.code === 'cafe')!
  expect(cafe.durationSeconds).toBeGreaterThan(0)
  const card = page.getByRole('article', { name: first.name, exact: true })
  await expect(card).toContainText(first.address)
  await card.getByRole('checkbox', { name: new RegExp(`^${cafe.label} `) }).check()
  const stay = card.getByRole('spinbutton', { name: `${first.name} 머무를 시간 (분)`, exact: true })
  await expect(stay).toHaveValue(String(cafe.durationSeconds! / 60))
  await stay.fill('100')
  const travelDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  await page.getByLabel('여행 날짜', { exact: true }).fill(travelDate)
  await page.getByLabel('시작시간', { exact: true }).fill('09:00')
  await page.getByLabel('종료시간', { exact: true }).fill('20:00')
  await page.getByRole('button', { name: '입력 확인', exact: true }).click()
  await expect(page.getByRole('heading', { name: '입력 형식을 확인했어요' })).toBeVisible()
  expect(diagnosisRequests).toBe(0)
  await page.screenshot({ path: `test-results/${info.project.name}-tourapi-live-planner.png`, fullPage: true })

  await page.getByRole('button', { name: '← 장소 선택으로 돌아가기', exact: true }).click()
  await expect(page.getByRole('button', { name: `${first.name} 선택됨`, exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '순서·시간 설정', exact: true }).click()
  await expect(stay).toHaveValue('100')
  await info.attach('real-search-summary', {
    body: JSON.stringify({ status: response.status(), returnedCount: places.length,
      selected: first, activityPolicyStatus: policyRes.status(), diagnosisRequests }, null, 2),
    contentType: 'application/json',
  })
})

test('real area list and successful empty search remain distinct', async ({ page }, info) => {
  test.setTimeout(60_000)
  await page.goto('/')
  const areaResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/places/search')
  await page.getByRole('button', { name: '부산 관광지 둘러보기' }).click()
  const response = await areaResponse
  expect(response.status()).toBe(200)
  const places = parsePlaces(await response.json())
  expect(places.length).toBeGreaterThan(0)
  await expect(page.locator('.place-list .place-row')).toHaveCount(places.length)
  const emptyResponse = page.waitForResponse((res) => new URL(res.url()).pathname === '/api/places/search')
  await page.getByRole('textbox', { name: '관광지 이름 또는 검색어' }).fill(`BusanFitNoSuchPlace${Date.now()}`)
  await page.getByRole('button', { name: '검색', exact: true }).click()
  const empty = await emptyResponse
  expect(empty.status()).toBe(200)
  expect(parsePlaces(await empty.json())).toEqual([])
  await expect(page.getByRole('heading', { name: '이 페이지에 표시할 장소가 없어요' })).toBeVisible()
  await info.attach('real-area-empty-summary', {
    body: JSON.stringify({ areaStatus: response.status(), returnedCount: places.length, emptyStatus: empty.status() }),
    contentType: 'application/json',
  })
})

test('legal Busan region includes Gamcheon and results beyond the old sixth page', async ({ page }, info) => {
  test.setTimeout(60_000)
  await page.goto('/')
  const searchResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/places/search')
  await page.getByRole('button', { name: '감천문화마을', exact: true }).click()
  const response = await searchResponse
  expect(response.status()).toBe(200)
  const places = parsePlaces(await response.json())
  const gamcheon = places.find((place) => place.id === 'tourapi-1997221')
  expect(gamcheon).toBeDefined()
  expect(gamcheon!.name).toBe('부산 감천문화마을')
  expect(gamcheon!.address).toContain('부산광역시 사하구')
  await expect(page.getByRole('button', { name: `${gamcheon!.name} 추가`, exact: true })).toBeVisible()
  await page.screenshot({ path: `test-results/${info.project.name}-tourapi-live-gamcheon.png`, fullPage: true })

  // The deprecated areaCode filter previously returned only 113 results (six pages).
  const seventhPage = await page.request.get('/api/places/search?keyword=&page=7&size=20')
  expect(seventhPage.status()).toBe(200)
  const seventhPagePlaces = parsePlaces(await seventhPage.json())
  expect(seventhPagePlaces.length).toBeGreaterThan(0)
  await info.attach('real-legal-region-regression', {
    body: JSON.stringify({ gamcheonId: gamcheon!.id, seventhPageCount: seventhPagePlaces.length }),
    contentType: 'application/json',
  })
})
