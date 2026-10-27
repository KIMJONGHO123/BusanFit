import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { diagnosisFixture, fixturePlace, fixturePolicy } from './diagnosis-fixtures'
import { stubMap } from './map-fixtures'

const endpoint = '**/api/v2/planner/diagnose'
export async function openPlanner(page: Page, liveMap = false, places = [fixturePlace]) {
  if (!liveMap) await stubMap(page)
  await page.route('**/api/places/search?*', (route) => route.fulfill({ json: places }))
  await page.route('**/api/planner/activity-policy', (route) => route.fulfill({ json: fixturePolicy }))
  await page.goto('/')
  await page.getByRole('button', { name: '부산 관광지 둘러보기' }).click()
  for (const place of places) await page.getByRole('button', { name: `${place.name} 추가`, exact: true }).click()
  await page.getByRole('button', { name: '순서·시간 설정', exact: true }).click()
  await page.getByLabel('여행 날짜', { exact: true }).fill('2026-11-01')
  await page.getByLabel('시작시간', { exact: true }).fill('09:00')
  await page.getByLabel('종료시간', { exact: true }).fill('12:00')
  await page.getByLabel('사진 촬영 20분').first().check()
  for (const place of places) await page.getByRole('spinbutton', { name: `${place.name} 머무를 시간 (분)` }).fill('100')
}
export async function login(page: Page) {
  await page.route('**/api/user/login', (route) => route.fulfill({ json: { accessToken: 'synthetic-test-token', nickname: '테스트 여행자' } }))
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('이메일', { exact: true }).fill('fixture@example.test')
  await dialog.getByLabel('비밀번호', { exact: true }).fill('synthetic-password')
  await dialog.getByRole('button', { name: '로그인하고 진단하기', exact: true }).click()
}
export async function diagnose(page: Page, result = diagnosisFixture()) {
  await page.route(endpoint, (route) => route.fulfill({ json: result }))
  await openPlanner(page)
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await login(page)
  await expect(page.getByRole('heading', { name: '일정 진단 결과', exact: true })).toBeFocused()
}
