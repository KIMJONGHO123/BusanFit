import type { Place } from '../places/places'

export type ActivityPolicy = {
  code: string
  label: string
  durationSeconds: number | null
  customDurationRequired: boolean
}
export type StopDraft = {
  place: Place
  plannedVisitTime: string
  visitTimeEnabled: boolean
  stayMinutes: string
  activityCodes: string[]
  otherMinutes: string
  restMinutes: string
  stayActivitySummary: string | null
}
export type Departure = Pick<Place, 'name' | 'latitude' | 'longitude'>
export type TripDraft = {
  travelDate: string
  startTime: string
  endTime: string
  departure: Departure
}
export const busanStation: Departure = { name: '부산역', latitude: 35.1151, longitude: 129.0414 }
export const initialTrip: TripDraft = { travelDate: '', startTime: '', endTime: '', departure: busanStation }
export function newStop(place: Place): StopDraft {
  return { place, plannedVisitTime: '', visitTimeEnabled: false, stayMinutes: '', activityCodes: [], otherMinutes: '', restMinutes: '', stayActivitySummary: null }
}

export function minutesToSeconds(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const seconds = Number(value) * 60
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : null
}
export function validTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function parseActivityPolicy(value: unknown): ActivityPolicy[] {
  if (!Array.isArray(value) || !value.length) throw new Error('활동 정책이 없습니다.')
  const seen = new Set<string>()
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('잘못된 활동 정책입니다.')
    const p = item as Record<string, unknown>
    if (typeof p.code !== 'string' || !p.code.trim() || seen.has(p.code) ||
      typeof p.label !== 'string' || !p.label.trim() || typeof p.customDurationRequired !== 'boolean' ||
      p.customDurationRequired !== (p.code === 'other' || p.code === 'rest') ||
      (p.customDurationRequired ? p.durationSeconds !== null :
        typeof p.durationSeconds !== 'number' || !Number.isSafeInteger(p.durationSeconds) || p.durationSeconds <= 0)) {
      throw new Error('잘못된 활동 정책입니다.')
    }
    seen.add(p.code)
    return p as ActivityPolicy
  })
}
function customActivitySeconds(stop: StopDraft, code: string): number | null {
  return minutesToSeconds(code === 'rest' ? stop.restMinutes : stop.otherMinutes)
}
export function activitySeconds(stop: StopDraft, policy: ActivityPolicy[]): number | null {
  let total = 0
  for (const code of stop.activityCodes) {
    const item = policy.find((p) => p.code === code)
    if (!item) return null
    const seconds = item.customDurationRequired ? customActivitySeconds(stop, code) : item.durationSeconds
    if (seconds === null) return null
    total += seconds
    if (!Number.isSafeInteger(total)) return null
  }
  return total
}
export function fillStayFromActivities(stop: StopDraft, policy: ActivityPolicy[] | null): StopDraft {
  const seconds = policy ? activitySeconds(stop, policy) : null
  return {
    ...stop,
    // REST and OTHER need valid user durations before a total can be filled.
    stayMinutes: seconds !== null && seconds > 0 && seconds % 60 === 0 ? String(seconds / 60) : '',
    stayActivitySummary: policy ? activitySummary(stop, policy) : null,
  }
}
export function toggleActivity(stop: StopDraft, code: string, policy: ActivityPolicy[] | null): StopDraft {
  return fillStayFromActivities({ ...stop, activityCodes: stop.activityCodes.includes(code)
    ? stop.activityCodes.filter((c) => c !== code) : [...stop.activityCodes, code] }, policy)
}

// Detect policy changes on returning to the editor without overwriting a manual stay.
export function activitySummary(stop: StopDraft, policy: ActivityPolicy[]): string | null {
  if (activitySeconds(stop, policy) === null) return null
  return JSON.stringify([...stop.activityCodes].sort().map((code) => [code,
    policy.find((p) => p.code === code)!.customDurationRequired ? customActivitySeconds(stop, code) : policy.find((p) => p.code === code)!.durationSeconds]))
}
export function moveStop(stops: StopDraft[], id: string, direction: -1 | 1): StopDraft[] {
  const index = stops.findIndex((s) => s.place.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= stops.length) return stops
  const next = [...stops]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function validateDraft(trip: TripDraft, stops: StopDraft[], policy: ActivityPolicy[] | null): string[] {
  const errors: string[] = []
  if (!validDate(trip.travelDate)) errors.push('여행 날짜를 확인해 주세요.')
  const timesValid = validTime(trip.startTime) && validTime(trip.endTime) && trip.endTime > trip.startTime
  if (!timesValid) errors.push('같은 날의 시작·종료시간을 입력하고, 종료시간을 더 늦게 설정해 주세요.')
  if (!trip.departure.name.trim() || !Number.isFinite(trip.departure.latitude) || Math.abs(trip.departure.latitude) > 90 ||
    !Number.isFinite(trip.departure.longitude) || Math.abs(trip.departure.longitude) > 180) errors.push('출발지를 다시 선택해 주세요.')
  if (!stops.length) errors.push('방문할 장소를 하나 이상 선택해 주세요.')
  if (!policy) errors.push('활동 정책을 불러온 뒤 다시 확인해 주세요.')
  if (new Set(stops.map((s) => s.place.id)).size !== stops.length) errors.push('같은 장소를 중복 선택할 수 없어요.')
  for (const stop of stops) {
    const prefix = `${stop.place.name}: `
    if (minutesToSeconds(stop.stayMinutes) === null) errors.push(prefix + '머무를 시간을 양의 정수(분)로 입력해 주세요.')
    if (stop.visitTimeEnabled && (!validTime(stop.plannedVisitTime) || !timesValid ||
      stop.plannedVisitTime < trip.startTime || stop.plannedVisitTime > trip.endTime)) errors.push(prefix + '방문시간을 여행 시작·종료 범위 안으로 지정해 주세요.')
    if (new Set(stop.activityCodes).size !== stop.activityCodes.length) errors.push(prefix + '활동을 중복 선택할 수 없어요.')
    if (policy && activitySeconds(stop, policy) === null) errors.push(prefix + '선택 활동과 휴식·기타 활동의 소요시간을 확인해 주세요.')
  }
  return errors
}

/** Future V2 request input only. Does not compute or submit a diagnosis. */
export function buildDiagnosisInput(trip: TripDraft, stops: StopDraft[], policy: ActivityPolicy[]) {
  if (validateDraft(trip, stops, policy).length) throw new Error('일정 입력을 확인해 주세요.')
  return {
    ...trip, timeZone: 'Asia/Seoul', transportMode: 'CAR',
    stops: stops.map((s) => ({
      placeId: s.place.id,
      ...(s.visitTimeEnabled && s.plannedVisitTime ? { plannedVisitTime: s.plannedVisitTime } : {}),
      plannedStaySeconds: minutesToSeconds(s.stayMinutes)!,
      activities: s.activityCodes.map((code) => ({ code,
        ...(policy.find((p) => p.code === code)?.customDurationRequired ? { durationSeconds: customActivitySeconds(s, code)! } : {}),
      })),
    })),
  }
}
