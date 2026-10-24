import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Icon } from '../../components/Icon'
import { PlaceImage } from '../places/PlaceImage'
import { DepartureSearch } from './DepartureSearch'
import { activitySeconds, activitySummary, fillStayFromActivities, minutesToSeconds, moveStop, parseActivityPolicy, toggleActivity, validateDraft } from './planner'
import type { ActivityPolicy, StopDraft, TripDraft } from './planner'

export function PlannerPage({ stops, setStops, trip, setTrip, onBack }: {
  stops: StopDraft[]
  setStops: Dispatch<SetStateAction<StopDraft[]>>
  trip: TripDraft
  setTrip: Dispatch<SetStateAction<TripDraft>>
  onBack: () => void
}) {
  const [policy, setPolicy] = useState<ActivityPolicy[] | null>(null)
  const [policyState, setPolicyState] = useState<'loading' | 'success' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  const [checked, setChecked] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const checkResult = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const controller = new AbortController()
    let disposed = false
    const timer = window.setTimeout(() => controller.abort(), 15000)
    fetch('/api/planner/activity-policy', { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error('활동 정책 조회 실패')
        return parseActivityPolicy(await response.json())
      }).then((result) => { if (!controller.signal.aborted) { setPolicy(result); setPolicyState('success') } })
      .catch(() => { if (!disposed) { setPolicy(null); setPolicyState('error') } })
      .finally(() => window.clearTimeout(timer))
    return () => { disposed = true; window.clearTimeout(timer); controller.abort() }
  }, [retry])
  const errors = validateDraft(trip, stops, policy)
  function updateStop(id: string, update: (stop: StopDraft) => StopDraft) {
    setStops((current) => current.map((s) => s.place.id === id ? update(s) : s))
    setChecked(false)
  }
  function updateTrip(update: Partial<TripDraft>) { setTrip((current) => ({ ...current, ...update })); setChecked(false) }
  const totalStay = stops.reduce<number | null>((total, stop) => {
    const seconds = minutesToSeconds(stop.stayMinutes)
    if (total === null || seconds === null || !Number.isSafeInteger(total + seconds)) return null
    return total + seconds
  }, stops.length ? 0 : null)
  return <>
    <a className="skip-link" href="#planner-main">본문으로 건너뛰기</a>
    <header className="site-header"><div className="header-inner">
      <button className="brand brand-button" onClick={onBack} aria-label="부산핏 장소 선택으로 돌아가기"><span className="brand-mark"><Icon name="check" /></span>busanfit<span className="brand-dot">.</span></button>
      <span className="header-context">여행 일정 만들기</span><span className="header-note">계획을, 가능한 여행으로.</span>
    </div></header>
    <main id="planner-main" className="workspace planner-workspace">
      <ol className="steps" aria-label="일정 만들기 단계">
        <li><span>01</span> 장소 선택</li><li aria-current="step"><span>02</span> 순서·시간 설정</li><li><span>03</span> 일정 진단</li>
      </ol>
      <div className="page-heading"><div><p className="eyebrow">나만의 속도로, 하루 구성하기</p>
        <h1 tabIndex={-1}>어떤 하루를 보내고 싶으세요?</h1><p>방문 순서를 정하고, 장소마다 하고 싶은 활동과 머무를 시간을 담아보세요.</p></div>
      </div>
      <form noValidate onSubmit={(event) => { event.preventDefault(); setChecked(true); window.requestAnimationFrame(() => checkResult.current?.focus()) }}>
        <div className="workspace-grid planner-grid">
          <section aria-labelledby="itinerary-heading" className="itinerary-area">
            <div className="itinerary-heading"><div><h2 id="itinerary-heading">방문 순서 <span>{stops.length}</span></h2><p>위에서 아래로 방문해요. 화살표로 순서를 바꿀 수 있어요.</p></div>
              <button type="button" className="button" onClick={onBack}><Icon name="plus" /> 장소 추가</button></div>
            {!stops.length && <div className="empty-state"><h3>방문할 장소를 골라주세요</h3><p>장소를 추가하면 시간과 활동을 설정할 수 있어요.</p><button type="button" className="button primary" onClick={onBack}>장소 선택으로 돌아가기</button></div>}
            <ol className="itinerary-list">
              {stops.map((stop, index) => {
                const sum = policy ? activitySeconds(stop, policy) : null
                const summary = policy ? activitySummary(stop, policy) : null
                return <li key={stop.place.id} className="itinerary-stop" data-testid="itinerary-stop">
                  <span className="timeline-number" aria-label={`${index + 1}번째 방문`}>{String(index + 1).padStart(2, '0')}</span>
                  <article className="stop-card" aria-labelledby={`stop-title-${index}`}>
                    <div className="stop-header"><PlaceImage place={stop.place} /><div className="stop-title"><span className="category">{stop.place.category || '분류 정보 없음'}</span>
                      <h3 id={`stop-title-${index}`}>{stop.place.name}</h3><p className="address">{stop.place.address || '주소 정보 없음'}</p></div></div>
                    <div className="stop-toolbar"><span>{index + 1}번째 방문 장소</span><div>
                      <button type="button" className="icon-button" disabled={index === 0} aria-label={`${stop.place.name} 위로 이동`} onClick={() => { setStops((current) => moveStop(current, stop.place.id, -1)); setChecked(false); setAnnouncement(`${stop.place.name}, ${index}번째로 이동했습니다.`) }}>↑</button>
                      <button type="button" className="icon-button" disabled={index === stops.length - 1} aria-label={`${stop.place.name} 아래로 이동`} onClick={() => { setStops((current) => moveStop(current, stop.place.id, 1)); setChecked(false); setAnnouncement(`${stop.place.name}, ${index + 2}번째로 이동했습니다.`) }}>↓</button>
                      <button type="button" className="icon-button" aria-label={`${stop.place.name} 일정에서 삭제`} onClick={() => { setStops((current) => current.filter((s) => s.place.id !== stop.place.id)); setChecked(false); setAnnouncement(`${stop.place.name}, 일정에서 삭제했습니다.`) }}><Icon name="close" /></button>
                    </div></div>
                    <div className="stop-body">
                      <fieldset className="activity-fieldset"><legend>이곳에서 하고 싶은 활동 <span className="optional">선택</span></legend>
                        {policyState === 'loading' && <p className="field-help" role="status">활동 정책을 불러오고 있어요.</p>}
                        {policyState === 'error' && <div className="policy-error"><p>활동 정보를 불러오지 못했어요. 선택한 활동과 입력은 유지됩니다.</p><button className="button" type="button" onClick={() => { setPolicyState('loading'); setRetry((n) => n + 1) }}>활동 정보 다시 불러오기</button></div>}
                        {policy && <div className="activity-options">{policy.map((item) => <label key={item.code} className={`activity-option ${stop.activityCodes.includes(item.code) ? 'is-selected' : ''}`}>
                          <input type="checkbox" checked={stop.activityCodes.includes(item.code)} onChange={() => updateStop(stop.place.id, (s) => toggleActivity(s, item.code, policy))} />
                          <span>{item.label}</span>{' '}<small>{item.customDurationRequired ? '직접 입력' : `${item.durationSeconds! / 60}분`}</small>
                        </label>)}</div>}
                      </fieldset>
                      {([
                        { code: 'rest', label: '휴식', field: 'restMinutes' },
                        { code: 'other', label: '기타 활동', field: 'otherMinutes' },
                      ] as const).filter((item) => stop.activityCodes.includes(item.code)).map((item) => <label key={item.code} className="field custom-duration">{item.label} 소요시간 (분)
                        <input aria-label={`${stop.place.name} ${item.label} 소요시간 (분)`} type="number" inputMode="numeric" min="1" step="1" value={stop[item.field]} onChange={(e) => updateStop(stop.place.id, (s) => fillStayFromActivities({ ...s, [item.field]: e.target.value }, policy))} placeholder="직접 입력" />
                      </label>)}
                      <div className="activity-total"><span>선택한 활동시간</span><strong>{sum === null ? '확인 필요' : `${sum / 60}분`}</strong></div>
                      <div className="stay-editor"><label className="field">머무를 시간 (분)
                        <input aria-label={`${stop.place.name} 머무를 시간 (분)`} type="number" inputMode="numeric" min="1" step="1" placeholder="머무를 시간 입력" value={stop.stayMinutes} onChange={(e) => updateStop(stop.place.id, (s) => ({ ...s, stayMinutes: e.target.value, stayActivitySummary: summary }))} />
                      </label><p className="field-help">활동을 선택하면 합계로 자동 채워져요. 휴식은 선택한 뒤 시간을 직접 입력해 주세요. 직접 수정할 수 있으며, 활동을 바꾸면 새 합계로 다시 채워져요.</p>
                      <div aria-live="polite">{stop.stayMinutes && summary !== null && summary !== stop.stayActivitySummary && (stop.stayActivitySummary !== null || stop.activityCodes.length > 0) && <p className="field-help activity-reminder">활동 정보가 바뀌었어요. 입력한 머무를 시간도 한 번 살펴보세요.</p>}</div></div>
                      <div className="visit-time-option">
                        <label className="visit-time-toggle"><input type="checkbox" aria-label={`${stop.place.name} 방문시간 지정`} aria-controls={`visit-time-${index}`} checked={stop.visitTimeEnabled}
                          onChange={(e) => updateStop(stop.place.id, (s) => ({ ...s, visitTimeEnabled: e.target.checked, plannedVisitTime: e.target.checked ? s.plannedVisitTime : '' }))} />방문시간 지정 <span className="optional">선택</span></label>
                        <p className="field-help">예약·공연처럼 정해진 시각이 있을 때만 켜주세요. 지정하지 않으면 진단 시 자동 배치해요.</p>
                        <div id={`visit-time-${index}`} hidden={!stop.visitTimeEnabled}>
                          <label className="field">방문 시각<input aria-label={`${stop.place.name} 방문 시각`} type="time" disabled={!stop.visitTimeEnabled} value={stop.plannedVisitTime} onChange={(e) => updateStop(stop.place.id, (s) => ({ ...s, plannedVisitTime: e.target.value }))} /></label>
                        </div>
                      </div>
                      <p className="field-help unverified-note"><Icon name="info" />선택한 활동 기준의 계획시간이에요. 장소별 권장 체류시간과 운영시간은 아직 확인되지 않았어요.</p>
                    </div>
                  </article>
                  {index < stops.length - 1 && <p className="segment-placeholder">다음 장소까지 이동시간 · 진단 후 확인</p>}
                </li>
              })}
            </ol>
          </section>
          <aside className="planner-sidebar" aria-label="여행 조건과 입력 요약">
            <section className="planner-panel"><p className="eyebrow">하루의 시작과 끝</p><h2>여행 조건</h2>
              <label className="field">여행 날짜<input type="date" value={trip.travelDate} onChange={(e) => updateTrip({ travelDate: e.target.value })} /></label>
              <div className="time-fields"><label className="field">시작시간<input type="time" value={trip.startTime} onChange={(e) => updateTrip({ startTime: e.target.value })} /></label>
                <label className="field">종료시간<input type="time" value={trip.endTime} onChange={(e) => updateTrip({ endTime: e.target.value })} /></label></div>
              <p className="field-help">한국 시간 · 하루 일정 · 자동차 이동</p>
              <DepartureSearch value={trip.departure} onChange={(departure) => updateTrip({ departure })} />
            </section>
            <section className="planner-panel summary-panel"><h2>입력한 일정</h2><dl><div><dt>방문 장소</dt><dd>{stops.length}곳</dd></div><div><dt>머무를 시간 합계</dt><dd>{totalStay === null ? '입력 필요' : `${totalStay / 60}분`}</dd></div><div><dt>이동·대기시간</dt><dd>진단 후 확인</dd></div></dl>
              <p className="field-help">머무를 시간 합계에는 활동이 포함돼요. 이동·대기시간이 확인되지 않아 여행 가능 여부는 아직 알 수 없어요.</p>
              <button type="submit" className="button primary next-button">입력 확인 <Icon name="check" /></button>
              <p className="field-help">진단 기능은 준비 중이에요. 지금은 입력 내용만 확인할 수 있어요.</p>
            </section>
          </aside>
        </div>
        {checked && <div ref={checkResult} className="input-check planner-panel" tabIndex={-1} role="status">
          {errors.length ? <><h2>입력을 조금 더 확인해 주세요</h2><ul>{errors.map((error, index) => <li key={index}>{error}</li>)}</ul></> : <><h2>입력 형식을 확인했어요</h2><p>방문 가능 여부를 진단한 결과는 아닙니다. 일정은 현재 브라우저 메모리에만 유지되며 새로고침하면 초기화돼요.</p></>}
        </div>}
      </form>
      <div className="planner-bottom"><button type="button" className="button" onClick={onBack}>← 장소 선택으로 돌아가기</button><p>화면을 오가도 입력은 유지돼요. 새로고침하면 초기화됩니다.</p></div>
      <footer className="page-footer"><span>busanfit.</span><p>가고 싶은 곳을 연결하고, 가능한 하루를 만들어요.</p></footer>
      <div className="sr-only" role="status">{announcement}</div>
    </main>
  </>
}
