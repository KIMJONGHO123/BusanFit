import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  addPlace,
  parsePlaces,
  safeImageUrl,
} from '../src/features/places/places'

// Synthetic test responses only. Never imported into the running application.
const place = {
  id: 'test-place-1',
  name: '테스트 관광지',
  address: '부산광역시 테스트 주소',
  category: '관광지',
  latitude: 35.16,
  longitude: 129.16,
  imageUrl: null,
}
const endpoint = '**/api/places/search?*'

test('keyboard dialog focus and automated accessibility', async ({ page }) => {
  await page.route(endpoint, (route) => route.fulfill({ json: [place] }))
  await page.goto('/')
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([])
  await page.getByRole('button', { name: '부산 관광지 둘러보기' }).click()
  await page.getByRole('button', { name: '테스트 관광지 상세 보기' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([])
  await page.keyboard.press('Shift+Tab')
  expect(
    await page.evaluate(() => !!document.activeElement?.closest('dialog')),
  ).toBe(true)
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: '테스트 관광지 상세 보기' }),
  ).toBeFocused()
})

test('request timeout ends loading and permits retry', async ({ page }) => {
  await page.clock.install()
  await page.route(endpoint, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await route.fulfill({ json: [place] })
  })
  await page.goto('/')
  await page.getByRole('button', { name: '부산 관광지 둘러보기' }).click()
  await expect(
    page.getByRole('heading', { name: '관광지를 찾고 있어요' }),
  ).toBeVisible()
  await page.clock.fastForward(16000)
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeEnabled()
})

test('response validation and duplicate selection protect place identity', () => {
  expect(parsePlaces([place, place])).toEqual([place])
  expect(addPlace([place], place)).toEqual([place])
  expect(addPlace([place], { ...place, id: 'other' }).map((p) => p.id)).toEqual(
    ['test-place-1', 'other'],
  )
  for (const value of [
    {},
    [null],
    [{ ...place, id: '' }],
    [{ ...place, latitude: 100 }],
    [{ ...place, longitude: NaN }],
  ]) {
    expect(() => parsePlaces(value)).toThrow()
  }
  expect(safeImageUrl('javascript:alert(1)')).toBeNull()
  expect(safeImageUrl('https://example.com/photo.jpg')).toBe(
    'https://example.com/photo.jpg',
  )
  expect(
    parsePlaces([{ ...place, estimatedStayMinutes: 90 }])[0],
  ).not.toHaveProperty('estimatedStayMinutes')
})

test('initial screen is honest, responsive and does not fetch invented results', async ({
  page,
}, info) => {
  let requests = 0
  await page.route(endpoint, async (route) => {
    requests++
    await route.fulfill({ json: [] })
  })
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: '어디에 가고 싶으세요?' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: '순서·시간 설정', exact: true }),
  ).toBeDisabled()
  expect(requests).toBe(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: `test-results/${info.project.name}-initial.png`,
    fullPage: true,
  })
})

test('search, detail, selection across searches, duplicate protection and removal', async ({
  page,
}, info) => {
  await page.route(endpoint, (route) => route.fulfill({ json: [place] }))
  await page.goto('/')
  await page.getByRole('textbox').fill('테스트')
  const req = page.waitForRequest((url) =>
    url.url().includes('keyword=%ED%85%8C%EC%8A%A4%ED%8A%B8'),
  )
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await req
  await page.getByRole('button', { name: '테스트 관광지 상세 보기' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText('정보 확인 불가', { exact: true })).toBeVisible()
  await expect(page.getByText('근거 정보 없음', { exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: '선택한 장소에 추가', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: '선택한 장소에 담겼어요' }),
  ).toBeDisabled()
  await page.screenshot({
    path: `test-results/${info.project.name}-detail-fixture.png`,
    fullPage: true,
  })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: '테스트 관광지 상세 보기' }),
  ).toBeFocused()
  await page.getByRole('button', { name: '해운대', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '테스트 관광지 선택됨' }),
  ).toBeDisabled()
  await expect(
    page.getByRole('heading', { name: '선택한 장소 1' }),
  ).toBeVisible()
  await page.screenshot({
    path: `test-results/${info.project.name}-results-fixture.png`,
    fullPage: true,
  })
  if (info.project.name === 'mobile')
    await page.getByRole('link', { name: /목록 보기/ }).click()
  await page.getByRole('button', { name: '테스트 관광지 선택 해제' }).click()
  await expect(
    page.getByRole('heading', { name: '선택한 장소 0' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('failure, empty results and malformed response are distinct; retry recovers', async ({
  page,
}) => {
  let call = 0
  await page.route(endpoint, (route) => {
    call++
    return call === 1
      ? route.fulfill({ status: 503, json: {} })
      : call === 2
        ? route.fulfill({ json: [] })
        : call === 3
          ? route.fulfill({ json: { invalid: true } })
          : route.fulfill({ json: [place] })
  })
  await page.goto('/')
  await page.getByRole('button', { name: '부산 관광지 둘러보기' }).click()
  await expect(page.getByRole('alert')).toContainText(
    '검색 정보를 불러오지 못했어요',
  )
  await expect(
    page.getByRole('heading', { name: '이 페이지에 표시할 장소가 없어요' }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: '다시 시도' }).click()
  await expect(
    page.getByRole('heading', { name: '이 페이지에 표시할 장소가 없어요' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: '다시 시도' }).click()
  await expect(
    page.getByRole('button', { name: '테스트 관광지 추가' }),
  ).toBeVisible()
})

test('a newer search wins over a slow earlier response', async ({ page }) => {
  await page.route(endpoint, async (route) => {
    const old =
      new URL(route.request().url()).searchParams.get('keyword') === '해운대'
    if (old) await new Promise((resolve) => setTimeout(resolve, 500))
    await route.fulfill({
      json: [{ ...place, name: old ? '이전 결과' : '최신 결과' }],
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: '해운대', exact: true }).click()
  await page.getByRole('button', { name: '태종대', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '최신 결과 추가' }),
  ).toBeVisible()
  await page.waitForTimeout(650)
  await expect(
    page.getByRole('button', { name: '이전 결과 추가' }),
  ).toHaveCount(0)
})

test('pagination preserves selection and offers return from an empty page', async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({
      json:
        new URL(route.request().url()).searchParams.get('page') === '1'
          ? Array.from({ length: 20 }, (_, i) => ({
              ...place,
              id: `test-${i}`,
              name: `장소 ${i}`,
            }))
          : [],
    }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: '부산 관광지 둘러보기' }).click()
  await page.getByRole('button', { name: '장소 0 추가', exact: true }).click()
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: '이 페이지에 표시할 장소가 없어요' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '이전', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '장소 0 선택됨' }),
  ).toBeDisabled()
})

for (const scenario of [
  'server-filtered',
  'client-deduplicated',
  'all-filtered',
] as const) {
  test(`pagination continues after ${scenario} and intervening empty pages`, async ({
    page,
  }, info) => {
    const firstPage = Array.from({ length: 19 }, (_, i) => ({
      ...place,
      id: `first-${i}`,
      name: `첫 페이지 장소 ${i}`,
    }))
    const requested: number[] = []
    await page.route(endpoint, (route) => {
      const query = new URL(route.request().url()).searchParams
      const pageNumber = Number(query.get('page'))
      expect(query.get('keyword')).toBe('해운대')
      expect(query.get('size')).toBe('20')
      requested.push(pageNumber)
      // Server filtering can produce 19 or 0 rows; 20 rows can become 19 after client deduplication.
      return route.fulfill({
        json:
          pageNumber === 1
            ? scenario === 'all-filtered'
              ? []
              : scenario === 'client-deduplicated'
                ? [...firstPage, firstPage[0]]
                : firstPage
            : pageNumber === 2
              ? []
              : [place],
      })
    })
    await page.goto('/')
    await page.getByRole('button', { name: '해운대', exact: true }).click()
    await expect(page.locator('.place-row')).toHaveCount(
      scenario === 'all-filtered' ? 0 : 19,
    )
    await expect(
      page.getByRole('button', { name: '이전', exact: true }),
    ).toBeDisabled()
    await expect(
      page.getByRole('button', { name: '다음', exact: true }),
    ).toBeEnabled()
    if (scenario !== 'all-filtered')
      await page
        .getByRole('button', { name: '첫 페이지 장소 0 추가', exact: true })
        .click()
    await page.getByRole('button', { name: '다음', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: '이 페이지에 표시할 장소가 없어요' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: '다음', exact: true }),
    ).toBeEnabled()
    await expect(page.getByText('2 페이지', { exact: true })).toBeVisible()
    if (scenario === 'all-filtered')
      await page.screenshot({
        path: `test-results/${info.project.name}-empty-page-fixture.png`,
        fullPage: true,
      })
    await page.getByRole('button', { name: '다음', exact: true }).click()
    await expect(
      page.getByRole('button', { name: '테스트 관광지 추가' }),
    ).toBeVisible()
    await page.getByRole('button', { name: '테스트 관광지 추가' }).click()
    await expect(
      page.getByRole('heading', {
        name: `선택한 장소 ${scenario === 'all-filtered' ? 1 : 2}`,
      }),
    ).toBeVisible()
    await page.getByRole('button', { name: '이전', exact: true }).click()
    await expect(page.getByText('2 페이지', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '이전', exact: true }).click()
    await expect(page.getByText('1 페이지', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('button', { name: '이전', exact: true }),
    ).toBeDisabled()
    expect(requested).toEqual([1, 2, 3, 2, 1])
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })
}

test('broken image has fallback and long names fit at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.route('**/broken.jpg', (route) => route.abort())
  await page.route(endpoint, (route) =>
    route.fulfill({
      json: [
        {
          ...place,
          name: '이름이아주긴관광지'.repeat(6),
          imageUrl: 'https://example.com/broken.jpg',
        },
      ],
    }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: '부산 관광지 둘러보기' }).click()
  await expect(page.getByText('사진 없음')).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})
