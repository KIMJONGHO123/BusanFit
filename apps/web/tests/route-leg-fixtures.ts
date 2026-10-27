import { diagnosisFixture, fixturePlace } from './diagnosis-fixtures'

// Synthetic multi-leg schedule for selection and unknown-data regressions only.
export function routeLegFixture(missingMiddle = false) {
  const places = [fixturePlace,
    { ...fixturePlace, id: 'tourapi-456', name: '두 번째 테스트 장소', latitude: 35.13, longitude: 129.07 },
    { ...fixturePlace, id: 'tourapi-789', name: '아주 긴 이름의 세 번째 테스트 관광지와 산책 공간', latitude: 35.16, longitude: 129.1 }]
  const result = diagnosisFixture()
  const first = result.schedule.segments[0]
  const times = [917, 73, 122]
  result.schedule.end = '2026-11-01T18:00:00+09:00'
  result.schedule.availableSeconds = 32400
  result.schedule.totalStaySeconds = 18000
  result.schedule.totalTravelSeconds = 1112
  result.schedule.requiredSeconds = 19112
  result.schedule.remainingSeconds = 13288
  result.schedule.segments = places.map((place, i) => ({ ...first, segmentId: `segment-${i}`, from: i ? places[i - 1].id : 'DEPARTURE', to: place.id,
    route: { ...first.route, value: { ...first.route.value!, seconds: times[i], coordinates: i ? [places[i - 1], place].map(({ latitude, longitude }) => ({ latitude, longitude })) : first.route.value!.coordinates } } }))
  let elapsed = 0
  result.schedule.stops = places.map((place, i) => {
    elapsed += times[i]
    const arrival = new Date(Date.parse(result.schedule.start) + elapsed * 1000).toISOString()
    elapsed += 6000
    return { ...result.schedule.stops[0], stopIndex: i, placeId: place.id, activitySeconds: i ? 0 : 1200, arrival, stayStart: arrival, departure: new Date(Date.parse(result.schedule.start) + elapsed * 1000).toISOString() }
  })
  if (missingMiddle) {
    result.decision = 'UNDETERMINED'
    result.schedule.calculationComplete = false
    result.schedule.totalTravelSeconds = result.schedule.totalWaitingSeconds = result.schedule.requiredSeconds = result.schedule.remainingSeconds = null
    result.schedule.segments[1].route = { ...first.route, value: null, limitation: '이동정보 확인 불가' }
    result.schedule.stops = result.schedule.stops.map((stop, i) => i === 0 ? stop : { ...stop, calculationComplete: false, arrival: null, stayStart: null, departure: null, waitingSeconds: null, limitation: '이동시간 미확인' })
  }
  result.ruleResults.push(...result.schedule.segments.slice(1).map((segment) => ({ ...result.ruleResults[0], target: { ...result.ruleResults[0].target, segmentId: segment.segmentId, from: segment.from, to: segment.to },
    evaluationStatus: segment.route.value ? 'EVALUATED' as const : 'UNVERIFIABLE' as const, outcome: segment.route.value ? 'PASS' as const : null, reason: segment.route.value ? '조회 시점 이동시간 확인' : '이동시간 미확인' })))
  result.coverage = result.ruleResults.map(({ ruleId, scope, target, evaluationStatus, reason }) => ({ ruleId, scope, target, evaluationStatus, reason }))
  return { places, result }
}
