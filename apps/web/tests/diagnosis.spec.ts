import { openPlanner, login, diagnose } from './diagnosis-helpers'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { formatDuration, parseDiagnosis } from '../src/features/diagnosis/diagnosis'
import { cautionDiagnosis, diagnosisFixture, fixturePlace, unknownDiagnosis } from './diagnosis-fixtures'

const endpoint = '**/api/v2/planner/diagnose'
test('contract rejects missing verification, invalid timing, geometry, targets and contradictory safety claims', () => {
  expect(parseDiagnosis(diagnosisFixture(), [fixturePlace.id]).decision).toBe('POSSIBLE')
  expect(parseDiagnosis(unknownDiagnosis(), [fixturePlace.id]).verificationStatus).toBe('UNKNOWN')
  for (const change of [
    { verificationStatus: null }, { decision: 'AVAILABLE' }, { diagnosedAt: '08:00' },
    { verificationStatus: 'VERIFIED' }, { ruleResults: null }, { schedule: {} }, { coverage: [] },
  ]) expect(() => parseDiagnosis({ ...diagnosisFixture(), ...change }, [fixturePlace.id])).toThrow()
  const invalidGeometry = diagnosisFixture()
  invalidGeometry.schedule.segments[0].route.value!.coordinates[0].latitude = 91
  expect(() => parseDiagnosis(invalidGeometry, [fixturePlace.id])).toThrow()
  expect(() => parseDiagnosis(diagnosisFixture(), ['tourapi-other'])).toThrow()
  const invalidTiming = unknownDiagnosis()
  invalidTiming.schedule.requiredSeconds = 0
  expect(() => parseDiagnosis(invalidTiming, [fixturePlace.id])).toThrow()
  const critical = diagnosisFixture()
  critical.ruleResults[0] = { ...critical.ruleResults[0], importance: 'CRITICAL', outcome: 'ADJUSTMENT_REQUIRED' }
  expect(() => parseDiagnosis(critical, [fixturePlace.id])).toThrow()
  expect(formatDuration(null)).toBe('계산 불가')
  expect(formatDuration(122)).toBe('2분 2초')
  expect(formatDuration(-61)).toBe('−1분 1초')
})

test('evaluated caution cannot accompany POSSIBLE while higher priority decisions remain valid', () => {
  const caution = cautionDiagnosis()
  expect(caution.schedule.remainingSeconds).toBe(900)
  expect(parseDiagnosis(caution, [fixturePlace.id]).decision).toBe('CAUTION')
  expect(() => parseDiagnosis({ ...caution, decision: 'POSSIBLE' }, [fixturePlace.id])).toThrow()
  const adjustment = cautionDiagnosis()
  adjustment.decision = 'ADJUSTMENT_REQUIRED'
  adjustment.ruleResults[0] = { ...adjustment.ruleResults[0], outcome: 'ADJUSTMENT_REQUIRED' }
  expect(parseDiagnosis(adjustment, [fixturePlace.id]).decision).toBe('ADJUSTMENT_REQUIRED')
  const unknown = unknownDiagnosis()
  unknown.verificationStatus = 'PARTIAL'
  unknown.ruleResults.push({ ...caution.ruleResults.at(-1)!, ruleId: 'RECOMMENDED_STAY', target: unknown.ruleResults[1].target })
  unknown.coverage = unknown.ruleResults.map(({ ruleId, scope, target, evaluationStatus, reason }) => ({ ruleId, scope, target, evaluationStatus, reason }))
  expect(parseDiagnosis(unknown, [fixturePlace.id]).decision).toBe('UNDETERMINED')
})

test('POSSIBLE with an evaluated caution shows a response error instead of a successful diagnosis', async ({ page }) => {
  await openPlanner(page)
  await page.route(endpoint, (route) => route.fulfill({ json: { ...cautionDiagnosis(), decision: 'POSSIBLE' } }))
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await login(page)
  await expect(page.getByRole('heading', { name: '진단을 완료하지 못했어요' })).toBeVisible()
  await expect(page.getByTestId('diagnosis-verdict')).toHaveCount(0)
  await expect(page.getByRole('spinbutton', { name: `${fixturePlace.name} 머무를 시간 (분)` })).toHaveValue('100')
  await page.route(endpoint, (route) => route.fulfill({ json: cautionDiagnosis() }))
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await expect(page.getByTestId('diagnosis-verdict')).toContainText('가능하지만, 한 번 더 살펴보세요')
  await expect(page.getByTestId('verification-status')).toContainText('일부 확인')
})

test('diagnose entry validates before login and closing login preserves input and focus', async ({ page }) => {
  await openPlanner(page)
  await page.getByLabel('시작시간', { exact: true }).fill('')
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await expect(page.getByRole('heading', { name: '입력을 조금 더 확인해 주세요' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByLabel('시작시간', { exact: true }).fill('09:00')
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: '진단하기', exact: true })).toBeFocused()
  await expect(page.getByRole('spinbutton', { name: `${fixturePlace.name} 머무를 시간 (분)` })).toHaveValue('100')
})

test('login submits the V2 contract once and pairs possible with partial, timeline and same-snapshot route', async ({ page }, info) => {
  let calls = 0
  await page.route(endpoint, (route) => {
    calls++
    expect(route.request().headers().authorization).toBe('Bearer synthetic-test-token')
    expect(route.request().postDataJSON()).toMatchObject({ travelDate: '2026-11-01', timeZone: 'Asia/Seoul', transportMode: 'CAR', stops: [{ placeId: fixturePlace.id, plannedStaySeconds: 6000, activities: [{ code: 'photo' }] }] })
    return route.fulfill({ json: diagnosisFixture() })
  })
  await openPlanner(page)
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await login(page)
  await expect(page.getByTestId('diagnosis-verdict')).toContainText('시간상 실행 가능한 일정이에요')
  await expect(page.getByTestId('diagnosis-verdict')).toContainText('일부 확인')
  await expect(page.getByRole('heading', { name: '확인하지 못한 항목', exact: true })).toBeVisible()
  await expect(page.getByText('15분 17초', { exact: true })).toHaveCount(2)
  await expect(page.frameLocator('iframe[title="'+String.fromCharCode(51068,51221,32,44221,47196,32,51648,46020)+'"]').locator('.place-label')).toHaveCount(2)
  expect(calls).toBe(1)
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0])
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `test-results/${info.project.name}-diagnosis-partial-fixture.png`, fullPage: true })
})

test('unknown travel has no invented totals, zero time or route', async ({ page }, info) => {
  await diagnose(page, unknownDiagnosis())
  await expect(page.getByTestId('diagnosis-verdict')).toContainText('아직 가능 여부를 판단할 수 없어요')
  await expect(page.getByTestId('verification-status')).toContainText('확인 불가')
  await expect(page.getByRole('heading', { name: '확인된 이동 경로가 없어요' })).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.locator('.diagnosis-metrics')).toContainText('계산 불가')
  await expect(page.locator('.diagnosis-metrics')).not.toContainText('0분')
  await page.screenshot({ path: `test-results/${info.project.name}-diagnosis-unknown-fixture.png`, fullPage: true })
})

test('critical adjustment remains visible together with partial verification', async ({ page }) => {
  const result = unknownDiagnosis()
  result.decision = 'ADJUSTMENT_REQUIRED'; result.verificationStatus = 'PARTIAL'
  result.ruleResults.push({ ...diagnosisFixture().ruleResults[0], ruleId: 'SCHEDULE_END', importance: 'CRITICAL', evaluationStatus: 'EVALUATED', outcome: 'ADJUSTMENT_REQUIRED', reason: '확인된 조정 필요', adjustment: '체류시간을 조정해 주세요.' })
  result.coverage = result.ruleResults.map(({ ruleId, scope, target, evaluationStatus, reason }) => ({ ruleId, scope, target, evaluationStatus, reason }))
  await diagnose(page, result)
  await expect(page.getByTestId('diagnosis-verdict')).toContainText('일정을 조금 조정해 주세요')
  await expect(page.getByTestId('diagnosis-verdict')).toContainText('일부 확인')
  await expect(page.getByText('확인된 조정 필요', { exact: true }).first()).toBeVisible()
})

test('failed login retains itinerary and allows retry, signup uses existing endpoints', async ({ page }) => {
  await openPlanner(page)
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await page.route('**/api/user/login', (route) => route.fulfill({ status: 400, body: 'private server error' }))
  await page.getByLabel('이메일', { exact: true }).fill('fixture@example.test')
  await page.getByLabel('비밀번호', { exact: true }).fill('synthetic-password')
  await page.getByRole('button', { name: '로그인하고 진단하기', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('로그인하지 못했어요')
  await expect(page.getByRole('alert')).not.toContainText('private')
  await page.getByRole('button', { name: '처음이신가요? 회원가입' }).click()
  let signup = false
  await page.route('**/api/user/signup', (route) => { signup = true; expect(route.request().postDataJSON().nickname).toBe('새 여행자'); return route.fulfill({ json: { message: 'ok' } }) })
  await page.route('**/api/user/login', (route) => route.fulfill({ json: { accessToken: 'synthetic-test-token', nickname: '새 여행자' } }))
  await page.route(endpoint, (route) => route.fulfill({ json: diagnosisFixture() }))
  await page.getByLabel('비밀번호', { exact: true }).fill('synthetic-password')
  await page.getByLabel('닉네임', { exact: true }).fill('새 여행자')
  await page.getByRole('button', { name: '가입하고 진단하기', exact: true }).click()
  await expect(page.getByRole('heading', { name: '일정 진단 결과', exact: true })).toBeVisible()
  expect(signup).toBe(true)
})

test('HTTP failures and malformed response preserve input, retry uses current snapshot', async ({ page }) => {
  await openPlanner(page)
  await page.route(endpoint, (route) => route.fulfill({ status: 502, body: 'secret upstream error' }))
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await login(page)
  await expect(page.getByRole('heading', { name: '진단을 완료하지 못했어요' })).toBeVisible()
  await expect(page.getByRole('alert')).not.toContainText('secret')
  await page.route(endpoint, (route) => route.fulfill({ json: { ...diagnosisFixture(), verificationStatus: null } }))
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await expect(page.getByRole('heading', { name: '진단을 완료하지 못했어요' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '일정 진단 결과', exact: true })).toHaveCount(0)
  await page.getByRole('spinbutton', { name: `${fixturePlace.name} 머무를 시간 (분)` }).fill('90')
  await page.route(endpoint, (route) => { expect(route.request().postDataJSON().stops[0].plannedStaySeconds).toBe(5400); const result = diagnosisFixture(); result.schedule.stops[0].plannedStaySeconds = 5400; result.schedule.totalStaySeconds = 5400; return route.fulfill({ json: result }) })
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await expect(page.getByRole('heading', { name: '일정 진단 결과', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '일정 수정하기', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: `${fixturePlace.name} 머무를 시간 (분)` })).toHaveValue('90')
})

test('expired authentication prompts login again and logout clears session without losing draft', async ({ page }) => {
  await diagnose(page)
  await page.getByRole('button', { name: '일정 수정하기', exact: true }).click()
  await page.route(endpoint, (route) => route.fulfill({ status: 401 }))
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('로그인이 만료됐어요')
  await page.route(endpoint, (route) => route.fulfill({ json: diagnosisFixture({ diagnosisId: 'synthetic-diagnosis-2' }) }))
  await login(page)
  await expect(page.getByRole('heading', { name: '일정 진단 결과', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: `${fixturePlace.name} 머무를 시간 (분)` })).toHaveValue('100')
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('in-flight diagnosis disables duplicate submissions and late responses cannot replace edited screen', async ({ page }) => {
  let release!: () => void
  const wait = new Promise<void>((resolve) => { release = resolve })
  let calls = 0
  await page.route(endpoint, async (route) => { calls++; await wait; await route.fulfill({ json: diagnosisFixture() }).catch(() => {}) })
  await openPlanner(page)
  await page.getByRole('button', { name: '진단하기', exact: true }).click()
  await login(page)
  await expect(page.getByRole('button', { name: '일정을 진단하고 있어요…' })).toBeDisabled()
  await expect(page.getByRole('spinbutton', { name: `${fixturePlace.name} 머무를 시간 (분)` })).toBeDisabled()
  expect(calls).toBe(1)
  await page.getByRole('button', { name: '← 장소 선택으로 돌아가기', exact: true }).click()
  release()
  await expect(page.getByRole('heading', { name: '어디에 가고 싶으세요?' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '일정 진단 결과', exact: true })).toHaveCount(0)
})
