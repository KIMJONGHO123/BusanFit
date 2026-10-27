import { RouteMap } from './RouteMap'
import { Icon } from '../../components/Icon'
import { formatDuration, formatTime, ruleLabels } from './diagnosis'
import type { Diagnosis, DiagnosisSnapshot, RuleResult, Target } from './diagnosis'

const decisions: Record<Diagnosis['decision'], { title: string; description: string }> = {
  POSSIBLE: { title: '시간상 실행 가능한 일정이에요', description: '확인한 이동·체류시간 기준으로 여행시간 안에 방문할 수 있어요.' },
  CAUTION: { title: '가능하지만, 한 번 더 살펴보세요', description: '시간상 계산은 완료됐지만 주의할 항목이 있어요.' },
  ADJUSTMENT_REQUIRED: { title: '일정을 조금 조정해 주세요', description: '확인된 조건에서 일정 조정이 필요한 항목이 있어요.' },
  UNDETERMINED: { title: '아직 가능 여부를 판단할 수 없어요', description: '시간 계산에 필요한 정보를 일부 확인하지 못했어요. 확인하지 못한 항목을 살펴보세요.' },
}
const verifications: Record<Diagnosis['verificationStatus'], { label: string; description: string }> = {
  VERIFIED: { label: '전체 확인', description: '적용 대상 진단 항목을 모두 확인했어요.' },
  PARTIAL: { label: '일부 확인', description: '확인하지 못한 운영시간·날씨·지역 정보 등이 있어요. 아래 확인 한계를 함께 살펴보세요.' },
  UNKNOWN: { label: '확인 불가', description: '적용 대상 항목을 확인하지 못했어요. 여행이 가능하거나 안전하다는 뜻이 아닙니다.' },
}

export function DiagnosisPage({ result, snapshot, onEdit, onSearch, onLogout, nickname }: {
  result: Diagnosis; snapshot: DiagnosisSnapshot; onEdit: () => void; onSearch: () => void; onLogout: () => void; nickname: string
}) {
  const decision = decisions[result.decision]
  const verification = verifications[result.verificationStatus]
  const schedule = result.schedule
  const unknown = result.ruleResults.filter((r) => r.evaluationStatus === 'UNVERIFIABLE')
  const issues = result.ruleResults.filter((r) => r.outcome === 'ADJUSTMENT_REQUIRED' || r.outcome === 'CAUTION')
  function targetLabel(target: Target): string {
    if (target.type === 'SCHEDULE') return '일정 전체'
    if (target.type === 'STOP') return `${target.stopIndex! + 1}. ${snapshot.stops[target.stopIndex!].place.name}`
    const segmentIndex = schedule.segments.findIndex((s) => s.segmentId === target.segmentId)
    return `${segmentIndex === 0 ? snapshot.trip.departure.name : snapshot.stops[segmentIndex - 1].place.name} → ${snapshot.stops[segmentIndex].place.name}`
  }
  function findings(items: RuleResult[]) {
    return <ul className="finding-list">{items.map((r, index) => <li key={`${r.ruleId}-${index}`}>
      <div className="finding-heading"><strong>{ruleLabels[r.ruleId] || '진단 항목'}</strong><span>{r.importance === 'CRITICAL' ? '중요 통제' : r.evaluationStatus === 'UNVERIFIABLE' ? '확인 불가' : r.outcome === 'ADJUSTMENT_REQUIRED' ? '조정 필요' : '주의'}</span></div>
      <p className="finding-target">{targetLabel(r.target)}</p><p>{r.reason}</p>{r.adjustment && <p className="finding-adjustment">{r.adjustment}</p>}
    </li>)}</ul>
  }
  return <>
    <a className="skip-link" href="#diagnosis-main">본문으로 건너뛰기</a>
    <header className="site-header"><div className="header-inner"><button className="brand brand-button" onClick={onSearch} aria-label="부산핏 장소 선택으로 돌아가기"><span className="brand-mark"><Icon name="check" /></span>busanfit<span className="brand-dot">.</span></button><span className="header-context">일정 진단 결과</span><div className="session-control"><span>{nickname}님</span><button type="button" onClick={onLogout}>로그아웃</button></div></div></header>
    <main id="diagnosis-main" className="workspace diagnosis-workspace">
      <ol className="steps" aria-label="일정 만들기 단계"><li><span>01</span> 장소 선택</li><li><span>02</span> 순서·시간 설정</li><li aria-current="step"><span>03</span> 일정 진단</li></ol>
      <div className="page-heading"><div><p className="eyebrow">계획을, 가능한 여행으로</p><h1 tabIndex={-1}>일정 진단 결과</h1><p>{snapshot.trip.travelDate} · {snapshot.stops.length}곳 · 자동차 이동</p></div><button className="button" onClick={onEdit}>일정 수정하기 <Icon name="arrow" /></button></div>
      <section className={`diagnosis-verdict diagnosis-${result.decision.toLowerCase()}`} aria-labelledby="verdict-heading" data-testid="diagnosis-verdict">
        <div className="verdict-copy"><p className="eyebrow">일정 판정</p><h2 id="verdict-heading">{decision.title}</h2><p>{decision.description}</p></div>
        <div className="verification-note"><span className="verification-badge" data-testid="verification-status"><Icon name="info" />{verification.label}</span><p>{verification.description}</p></div>
      </section>
      <section className="diagnosis-metrics" aria-label="서버에서 계산한 일정 시간">
        {[['여행 가능 시간', schedule.availableSeconds], ['총 필요시간', schedule.requiredSeconds], ['이동시간', schedule.totalTravelSeconds], ['잔여시간', schedule.remainingSeconds]].map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{formatDuration(value as number | null)}</strong></div>)}
      </section>
      {!schedule.calculationComplete && <p className="calculation-note"><Icon name="info" />미확인 이동 구간 이후의 예상시각과 정확한 총시간·잔여시간은 계산할 수 없어요. 확인된 조정 필요 사항은 그대로 표시합니다.</p>}
      <div className="diagnosis-grid">
        <section className="planner-panel result-timeline" aria-labelledby="timeline-heading"><div className="section-title"><h2 id="timeline-heading">예상 일정</h2><span>한국 시간 · 날짜 포함</span></div><p className="field-help">이동·대기·머무를 시간을 반영한 서버 계산 결과예요.</p>
          <p className="timeline-origin"><Icon name="pin" /><span>{snapshot.trip.departure.name}<small>{formatTime(schedule.start)} 출발</small></span></p>
          <ol className="result-stops">{schedule.stops.map((stop, i) => {
            const segment = schedule.segments[i]
            return <li key={stop.placeId}>
              <p className="result-travel"><span>자동차 이동</span><strong>{formatDuration(segment.route.value?.seconds ?? null)}</strong></p>
              <div className="result-stop-title"><span className="result-stop-number">{i + 1}</span><h3>{snapshot.stops[i].place.name}</h3></div>
              <dl className="stop-timing"><div><dt>예상 도착</dt><dd>{formatTime(stop.arrival)}</dd></div>{stop.plannedVisitTime && <div><dt>고정 방문시간</dt><dd>{formatTime(stop.plannedVisitTime)}</dd></div>}<div><dt>대기</dt><dd>{formatDuration(stop.waitingSeconds)}</dd></div><div><dt>머무를 시간</dt><dd>{formatDuration(stop.plannedStaySeconds)}</dd></div><div><dt>예상 출발</dt><dd>{formatTime(stop.departure)}</dd></div></dl>
              {stop.limitation && <p className="field-help">{stop.limitation}</p>}
            </li>
          })}</ol>
        </section>
        <div className="result-side"><section className="planner-panel" aria-labelledby="route-heading"><div className="section-title"><h2 id="route-heading">일정 경로 지도</h2><span>확인된 구간만 표시</span></div><RouteMap key={result.diagnosisId} segments={schedule.segments} snapshot={snapshot} /><p className="field-help">확인된 이동 구간만 연결해요. 이동시간과 경로는 같은 진단 조회 결과입니다.</p><p className="field-help">TMAP 조회 시점의 예상시간이며, 미래 출발시각 예측은 아니에요.</p></section>
          <section className="planner-panel diagnosis-context"><h2>이번 진단의 기준</h2><dl><div><dt>최종 체류 합계</dt><dd>{formatDuration(schedule.totalStaySeconds)}</dd></div><div><dt>대기 합계</dt><dd>{formatDuration(schedule.totalWaitingSeconds)}</dd></div><div><dt>진단 시각</dt><dd>{formatTime(result.diagnosedAt)}</dd></div></dl><p className="field-help">활동시간은 머무를 시간에 포함되어 있어요. 다시 더하지 않습니다.</p></section>
        </div>
      </div>
      <section className="planner-panel result-findings" aria-labelledby="issues-heading"><div className="section-title"><h2 id="issues-heading">조정·주의할 사항</h2><span>{issues.length}건</span></div>{issues.length ? findings(issues) : <p className="field-help">확인한 항목에서는 조정·주의 사항이 없어요. 확인하지 못한 항목은 아래에서 따로 살펴보세요.</p>}</section>
      <section className="planner-panel result-findings" aria-labelledby="limits-heading"><div className="section-title"><h2 id="limits-heading">확인하지 못한 항목</h2><span>{unknown.length}건</span></div><p className="field-help">미확인·미지원 정보는 정상이나 안전으로 간주하지 않아요.</p>{unknown.length ? findings(unknown) : <p className="field-help">적용 대상 진단 항목을 확인했어요.</p>}</section>
      <details className="planner-panel result-details"><summary>전체 진단 항목과 데이터 출처</summary><ul>{result.coverage.map((c, i) => <li key={`${c.ruleId}-${i}`}><strong>{ruleLabels[c.ruleId] || '진단 항목'}</strong><span>{targetLabel(c.target)} · {c.evaluationStatus === 'EVALUATED' ? '평가 완료' : c.evaluationStatus === 'UNVERIFIABLE' ? '확인 불가' : '적용 대상 아님'}{c.scope.type === 'REGION' ? ` · 지역 ${c.scope.regionCode}` : ''}</span><p>{c.reason}</p></li>)}</ul><h3>데이터 확인 내역</h3><ul>{result.dataReferences.map((r, i) => <li key={i}><strong>{r.source === 'UNSUPPORTED' ? '근거 미제공' : r.source} · {r.kind === 'ROUTE' ? '이동 경로' : r.kind === 'REGION' ? '지역' : r.kind === 'PLACE' ? '장소' : '권장 체류시간'}</strong><span>{r.confirmed ? '확인됨' : '확인 불가'} · {r.checkedAt ? formatTime(r.checkedAt) : '확인시각 없음'}</span>{r.limitation && <p>{r.limitation}</p>}</li>)}</ul></details>
      <div className="planner-bottom"><button className="button primary" onClick={onEdit}>일정 수정하고 다시 진단하기</button><p>입력과 결과는 현재 화면에서만 유지돼요. 새로고침하면 초기화됩니다.</p></div>
      <footer className="page-footer"><span>busanfit.</span><p>가고 싶은 곳을 연결하고, 가능한 하루를 만들어요.</p></footer>
    </main>
  </>
}
