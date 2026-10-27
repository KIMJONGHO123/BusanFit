import type { Diagnosis } from '../src/features/diagnosis/diagnosis'

export const fixturePlace = { id: 'tourapi-123', name: '테스트 문화마을', address: '부산 테스트 주소', category: '관광지', latitude: 35.0975, longitude: 129.0106, imageUrl: null }
export const fixturePolicy = [{ code: 'photo', label: '사진 촬영', durationSeconds: 1200, customDurationRequired: false }, { code: 'rest', label: '휴식', durationSeconds: null, customDurationRequired: true }, { code: 'other', label: '기타 활동', durationSeconds: null, customDurationRequired: true }]

// Synthetic server-contract data used only in tests. Never imported by product code.
export function diagnosisFixture(overrides: Partial<Diagnosis> = {}): Diagnosis {
  const target = { type: 'STOP' as const, stopIndex: 0, placeId: fixturePlace.id, segmentId: null, from: null, to: null }
  const scope = { type: 'NATIONAL' as const, regionCode: null }
  const ruleResults: Diagnosis['ruleResults'] = [
    { ruleId: 'TRAVEL_TIME', scope, importance: 'IMPORTANT', target: { type: 'SEGMENT', stopIndex: null, placeId: null, segmentId: 'segment-0', from: 'DEPARTURE', to: fixturePlace.id }, evaluationStatus: 'EVALUATED', outcome: 'PASS', condition: 'ROUTE', reason: '조회 시점의 이동시간을 확인했습니다.', adjustment: null },
    { ruleId: 'OPERATING_HOURS', scope, importance: 'IMPORTANT', target, evaluationStatus: 'UNVERIFIABLE', outcome: null, condition: 'OPENING', reason: '운영시간 정보 연동 미지원', adjustment: '방문 전 운영시간을 확인해 주세요.' },
    { ruleId: 'WEATHER', scope, importance: 'IMPORTANT', target, evaluationStatus: 'UNVERIFIABLE', outcome: null, condition: 'WEATHER', reason: '날씨 정보를 확인하지 못했습니다.', adjustment: null },
  ]
  return {
    diagnosisId: 'synthetic-diagnosis-1', decision: 'POSSIBLE', verificationStatus: 'PARTIAL', summary: '시간상 실행 가능하며 일부 정보는 확인하지 못했습니다.',
    diagnosedAt: '2026-11-01T08:00:00+09:00',
    schedule: {
      start: '2026-11-01T09:00:00+09:00', end: '2026-11-01T12:00:00+09:00', availableSeconds: 10800,
      totalStaySeconds: 6000, totalTravelSeconds: 917, totalWaitingSeconds: 0, requiredSeconds: 6917, remainingSeconds: 3883, calculationComplete: true,
      stops: [{ stopIndex: 0, placeId: fixturePlace.id, plannedVisitTime: null, plannedStaySeconds: 6000, activitySeconds: 1200, arrival: '2026-11-01T09:15:17+09:00', stayStart: '2026-11-01T09:15:17+09:00', departure: '2026-11-01T10:55:17+09:00', waitingSeconds: 0, calculationComplete: true, limitation: null }],
      segments: [{ segmentId: 'segment-0', from: 'DEPARTURE', to: fixturePlace.id, route: { source: 'TMAP', checkedAt: '2026-11-01T08:00:00+09:00', limitation: null,
        value: { seconds: 917, distanceMeters: 5200, coordinates: [{ latitude: 35.1151, longitude: 129.0414 }, { latitude: 35.115, longitude: 129.034 }, { latitude: 35.107, longitude: 129.034 }, { latitude: 35.103, longitude: 129.020 }, { latitude: 35.100, longitude: 129.021 }, { latitude: 35.0975, longitude: 129.0106 }] } } }],
    },
    ruleResults, coverage: ruleResults.map(({ ruleId, scope, target, evaluationStatus, reason }) => ({ ruleId, scope, target, evaluationStatus, reason })),
    dataReferences: [{ kind: 'ROUTE', targetId: 'segment-0', source: 'TMAP', checkedAt: '2026-11-01T08:00:00+09:00', confirmed: true, limitation: null }],
    ...overrides,
  }
}

export function unknownDiagnosis(): Diagnosis {
  const d = diagnosisFixture({ decision: 'UNDETERMINED', verificationStatus: 'UNKNOWN' })
  d.schedule = { ...d.schedule, totalTravelSeconds: null, totalWaitingSeconds: null, requiredSeconds: null, remainingSeconds: null, calculationComplete: false,
    stops: d.schedule.stops.map((s) => ({ ...s, arrival: null, stayStart: null, departure: null, waitingSeconds: null, calculationComplete: false, limitation: '이동시간 미확인' })),
    segments: d.schedule.segments.map((s) => ({ ...s, route: { ...s.route, value: null, limitation: 'TMAP 조회 실패' } })),
  }
  d.ruleResults = d.ruleResults.map((r) => ({ ...r, evaluationStatus: 'UNVERIFIABLE', outcome: null, reason: '확인 불가' }))
  d.coverage = d.ruleResults.map(({ ruleId, scope, target, evaluationStatus, reason }) => ({ ruleId, scope, target, evaluationStatus, reason }))
  d.dataReferences = d.dataReferences.map((r) => ({ ...r, confirmed: false, limitation: '이동 미확인' }))
  return d
}

export function cautionDiagnosis(): Diagnosis {
  const d = diagnosisFixture({ decision: 'CAUTION' })
  d.schedule = { ...d.schedule, totalTravelSeconds: 3900, requiredSeconds: 9900, remainingSeconds: 900,
    stops: d.schedule.stops.map((s) => ({ ...s, arrival: '2026-11-01T10:05:00+09:00', stayStart: '2026-11-01T10:05:00+09:00', departure: '2026-11-01T11:45:00+09:00' })),
    segments: d.schedule.segments.map((s) => ({ ...s, route: { ...s.route, value: { ...s.route.value!, seconds: 3900 } } })),
  }
  d.ruleResults.push({ ruleId: 'REMAINING_TIME', scope: { type: 'NATIONAL', regionCode: null }, importance: 'NORMAL',
    target: { type: 'SCHEDULE', stopIndex: null, placeId: null, segmentId: null, from: null, to: null },
    evaluationStatus: 'EVALUATED', outcome: 'CAUTION', condition: 'REMAINING_TIME', reason: '잔여시간이 30분 미만입니다.', adjustment: '일정 여유시간을 확보해 주세요.' })
  d.coverage = d.ruleResults.map(({ ruleId, scope, target, evaluationStatus, reason }) => ({ ruleId, scope, target, evaluationStatus, reason }))
  return d
}
