import type { StopDraft, TripDraft } from '../planner/planner'

export type DiagnosisSnapshot = { trip: TripDraft; stops: StopDraft[] }
export type Scope = { type: 'NATIONAL' | 'REGION'; regionCode: string | null }
export type Target = { type: 'SCHEDULE' | 'STOP' | 'SEGMENT'; stopIndex: number | null; placeId: string | null; segmentId: string | null; from: string | null; to: string | null }
export type EvaluationStatus = 'EVALUATED' | 'UNVERIFIABLE' | 'NOT_APPLICABLE'
export type RuleResult = { ruleId: string; scope: Scope; importance: 'NORMAL' | 'IMPORTANT' | 'CRITICAL'; target: Target; evaluationStatus: EvaluationStatus; outcome: 'PASS' | 'CAUTION' | 'ADJUSTMENT_REQUIRED' | null; condition: string; reason: string; adjustment: string | null }
export type Coordinate = { latitude: number; longitude: number }
export type Segment = { segmentId: string; from: string; to: string; route: { value: { seconds: number; distanceMeters: number; coordinates: Coordinate[] } | null; source: string; checkedAt: string | null; limitation: string | null } }
export type StopTiming = { stopIndex: number; placeId: string; plannedVisitTime: string | null; plannedStaySeconds: number; activitySeconds: number; arrival: string | null; stayStart: string | null; departure: string | null; waitingSeconds: number | null; calculationComplete: boolean; limitation: string | null }
export type Diagnosis = {
  diagnosisId: string
  decision: 'POSSIBLE' | 'CAUTION' | 'ADJUSTMENT_REQUIRED' | 'UNDETERMINED'
  verificationStatus: 'VERIFIED' | 'PARTIAL' | 'UNKNOWN'
  summary: string
  schedule: { start: string; end: string; availableSeconds: number; totalStaySeconds: number; totalTravelSeconds: number | null; totalWaitingSeconds: number | null; requiredSeconds: number | null; remainingSeconds: number | null; calculationComplete: boolean; stops: StopTiming[]; segments: Segment[] }
  ruleResults: RuleResult[]
  coverage: { ruleId: string; scope: Scope; target: Target; evaluationStatus: EvaluationStatus; reason: string }[]
  diagnosedAt: string
  dataReferences: { kind: string; targetId: string; source: string; checkedAt: string | null; confirmed: boolean; limitation: string | null }[]
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('잘못된 진단 응답')
  return value as Record<string, unknown>
}
function ensure(condition: boolean): asserts condition {
  if (!condition) throw new Error('잘못된 진단 응답')
}
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim()
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v)
const seconds = (v: unknown) => integer(v) && v >= 0
const nullableText = (v: unknown) => v === null || text(v)
const instant = (v: unknown): v is string => text(v) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v))
function array(value: unknown): unknown[] { ensure(Array.isArray(value)); return value }
function scope(value: unknown) {
  const s = object(value)
  ensure(s.type === 'NATIONAL' ? s.regionCode === null : s.type === 'REGION' && text(s.regionCode))
}
function status(value: unknown) { ensure(value === 'EVALUATED' || value === 'UNVERIFIABLE' || value === 'NOT_APPLICABLE') }

/** Validate the server contract. Final decisions and time totals are never computed in the browser. */
export function parseDiagnosis(value: unknown, placeIds: string[]): Diagnosis {
  const d = object(value)
  ensure(text(d.diagnosisId) && text(d.summary) && instant(d.diagnosedAt))
  ensure(['POSSIBLE', 'CAUTION', 'ADJUSTMENT_REQUIRED', 'UNDETERMINED'].includes(String(d.decision)))
  ensure(['VERIFIED', 'PARTIAL', 'UNKNOWN'].includes(String(d.verificationStatus)))
  const s = object(d.schedule)
  ensure(instant(s.start) && instant(s.end) && seconds(s.availableSeconds) && seconds(s.totalStaySeconds) && typeof s.calculationComplete === 'boolean')
  for (const key of ['totalTravelSeconds', 'totalWaitingSeconds', 'requiredSeconds']) ensure(s[key] === null || seconds(s[key]))
  ensure(s.remainingSeconds === null || integer(s.remainingSeconds))
  if (s.calculationComplete) ensure(['totalTravelSeconds', 'totalWaitingSeconds', 'requiredSeconds', 'remainingSeconds'].every((key) => s[key] !== null))
  else ensure(s.requiredSeconds === null && s.remainingSeconds === null)
  const stops = array(s.stops)
  const segments = array(s.segments)
  ensure(stops.length === placeIds.length && stops.length > 0 && segments.length === stops.length)
  stops.forEach((value, i) => {
    const stop = object(value)
    ensure(stop.stopIndex === i && stop.placeId === placeIds[i] && integer(stop.plannedStaySeconds) && stop.plannedStaySeconds > 0 && seconds(stop.activitySeconds))
    ensure(typeof stop.calculationComplete === 'boolean' && nullableText(stop.limitation) && (stop.plannedVisitTime === null || instant(stop.plannedVisitTime)))
    for (const key of ['arrival', 'stayStart', 'departure']) ensure(stop.calculationComplete ? instant(stop[key]) : stop[key] === null)
    ensure(stop.calculationComplete ? seconds(stop.waitingSeconds) : stop.waitingSeconds === null && text(stop.limitation))
  })
  const segmentIds = new Set<string>()
  segments.forEach((value, i) => {
    const segment = object(value)
    ensure(text(segment.segmentId) && !segmentIds.has(segment.segmentId) && segment.to === placeIds[i] && segment.from === (i ? placeIds[i - 1] : 'DEPARTURE'))
    segmentIds.add(segment.segmentId)
    const evidence = object(segment.route)
    ensure(text(evidence.source) && (evidence.checkedAt === null || instant(evidence.checkedAt)))
    if (evidence.value === null) ensure(text(evidence.limitation))
    else {
      const route = object(evidence.value)
      ensure(instant(evidence.checkedAt) && evidence.limitation === null && seconds(route.seconds) && seconds(route.distanceMeters))
      const coordinates = array(route.coordinates)
      ensure(coordinates.length > 0)
      coordinates.forEach((value) => {
        const c = object(value)
        ensure(typeof c.latitude === 'number' && Number.isFinite(c.latitude) && Math.abs(c.latitude) <= 90 && typeof c.longitude === 'number' && Number.isFinite(c.longitude) && Math.abs(c.longitude) <= 180)
      })
    }
  })
  function target(value: unknown) {
    const t = object(value)
    ensure(t.type === 'SCHEDULE' || t.type === 'STOP' || t.type === 'SEGMENT')
    if (t.type === 'STOP') ensure(integer(t.stopIndex) && t.stopIndex >= 0 && placeIds[t.stopIndex] === t.placeId)
    if (t.type === 'SEGMENT') ensure(text(t.segmentId) && segmentIds.has(t.segmentId) && segments.some((segment) => {
      const item = object(segment)
      return item.segmentId === t.segmentId && item.from === t.from && item.to === t.to
    }))
  }
  array(d.ruleResults).forEach((value) => {
    const r = object(value)
    ensure(text(r.ruleId) && text(r.condition) && text(r.reason) && nullableText(r.adjustment) && ['NORMAL', 'IMPORTANT', 'CRITICAL'].includes(String(r.importance)))
    scope(r.scope); target(r.target); status(r.evaluationStatus)
    ensure(r.evaluationStatus === 'EVALUATED' ? ['PASS', 'CAUTION', 'ADJUSTMENT_REQUIRED'].includes(String(r.outcome)) : r.outcome === null)
  })
  array(d.coverage).forEach((value) => {
    const c = object(value)
    ensure(text(c.ruleId) && text(c.reason)); scope(c.scope); target(c.target); status(c.evaluationStatus)
  })
  array(d.dataReferences).forEach((value) => {
    const r = object(value)
    ensure(text(r.kind) && text(r.targetId) && text(r.source) && typeof r.confirmed === 'boolean')
    ensure(r.checkedAt === null || instant(r.checkedAt))
    ensure(r.confirmed ? instant(r.checkedAt) && r.limitation === null : text(r.limitation))
  })
  const rules = d.ruleResults as RuleResult[]
  const evaluated = rules.some((r) => r.evaluationStatus === 'EVALUATED')
  const unverifiable = rules.some((r) => r.evaluationStatus === 'UNVERIFIABLE')
  const coverage = d.coverage as Diagnosis['coverage']
  function key(r: Pick<RuleResult, 'ruleId' | 'scope' | 'target' | 'evaluationStatus'>) {
    return JSON.stringify([r.ruleId, r.scope.type, r.scope.regionCode, r.target.type, r.target.stopIndex, r.target.placeId, r.target.segmentId, r.target.from, r.target.to, r.evaluationStatus])
  }
  const resultKeys = new Set(rules.map(key)), coverageKeys = new Set(coverage.map(key))
  ensure([...resultKeys].every((k) => coverageKeys.has(k)) && [...coverageKeys].every((k) => resultKeys.has(k)))
  ensure(d.verificationStatus === 'VERIFIED' ? evaluated && !unverifiable : d.verificationStatus === 'PARTIAL' ? evaluated && unverifiable : !evaluated)
  ensure(evaluated || d.decision === 'UNDETERMINED')
  ensure(!s.calculationComplete || stops.every((stop) => object(stop).calculationComplete === true) && segments.every((segment) => object(object(segment).route).value !== null))
  ensure(d.decision === 'ADJUSTMENT_REQUIRED' || !rules.some((r) => r.outcome === 'ADJUSTMENT_REQUIRED'))
  ensure(d.decision !== 'POSSIBLE' || !rules.some((r) => r.evaluationStatus === 'EVALUATED' && r.outcome === 'CAUTION'))
  ensure(s.calculationComplete || d.decision === 'ADJUSTMENT_REQUIRED' || d.decision === 'UNDETERMINED')
  return value as Diagnosis
}

export function formatDuration(value: number | null): string {
  if (value === null) return '계산 불가'
  const absolute = Math.abs(value)
  const hours = Math.floor(absolute / 3600)
  const minutes = Math.floor(absolute % 3600 / 60)
  const seconds = absolute % 60
  const parts = [hours ? `${hours}시간` : '', minutes ? `${minutes}분` : '', seconds ? `${seconds}초` : ''].filter(Boolean)
  return `${value < 0 ? '−' : ''}${parts.join(' ') || '0분'}`
}
const dateFormat = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
export const formatTime = (value: string | null): string => value === null ? '계산 불가' : dateFormat.format(new Date(value))

export const ruleLabels: Record<string, string> = {
  TRAVEL_TIME: '이동시간', FIXED_VISIT_ARRIVAL: '고정 방문시간 도착', SCHEDULE_CONFLICT: '일정 충돌', SCHEDULE_END: '일정 종료시간',
  RECOMMENDED_STAY: '권장 체류시간', REMAINING_TIME: '여유시간', TRAVEL_RATIO: '이동 비율', REGION_APPLICABILITY: '지역 확인', OPERATING_HOURS: '운영시간', WEATHER: '날씨', REGIONAL_CONTROL: '지역 통제·위험',
}
