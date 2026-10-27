import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import type { DiagnosisSnapshot, Segment } from './diagnosis'
import { createRouteMapDocument, routeMapData } from './route-map'
import { formatDuration } from './diagnosis'

export function RouteMap({ segments, snapshot }: { segments: Segment[]; snapshot: DiagnosisSnapshot }) {
  const data = useMemo(() => routeMapData(segments, snapshot), [segments, snapshot])
  if (!data.segments.length) return <div className="route-empty"><Icon name="pin" /><h3>확인된 이동 경로가 없어요</h3><p>이동정보를 확인한 뒤 다시 진단해 주세요. 임의 경로는 표시하지 않아요.</p></div>
  return <ConnectedMap data={data} />
}

function ConnectedMap({ data }: { data: ReturnType<typeof routeMapData> }) {
  const appKey = import.meta.env.VITE_TMAP_MAP_APP_KEY?.trim() || ''
  const frame = useRef<HTMLIFrameElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectId = useId()
  const selected = data.legs.find((leg) => leg.id === selectedId)
  const source = useMemo(() => createRouteMapDocument(appKey, data), [appKey, data])
  useEffect(() => {
    const timer = window.setTimeout(() => setStatus('error'), 25000)
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || ![window.location.origin, 'null'].includes(event.origin) || event.data?.channel !== 'busanfit-route-map') return
      if (event.data.state === 'error') { clearTimeout(timer); setStatus('error') }
      if (event.data.state === 'ready') { clearTimeout(timer); setStatus((current) => current === 'error' ? current : 'ready') }
      if (event.data.state === 'selected' && data.legs.some((leg) => leg.id === event.data.segmentId)) setSelectedId(event.data.segmentId)
    }
    window.addEventListener('message', receive)
    return () => { clearTimeout(timer); window.removeEventListener('message', receive) }
  }, [attempt, data.legs])
  useEffect(() => {
    if (status === 'ready') frame.current?.contentWindow?.postMessage({ channel: 'busanfit-route-selection', segmentId: selectedId }, window.location.origin)
  }, [selectedId, status, attempt])
  return <>
    <div className="route-map-shell">
      {appKey && <iframe key={attempt} ref={frame} title="일정 경로 지도" srcDoc={source} sandbox="allow-scripts allow-same-origin" className="route-map-frame" />}
      {(!appKey || status !== 'ready') && <div className="route-map-message" role="status">
        <Icon name="pin" /><h3>{!appKey ? '지도 연결 설정이 필요해요' : status === 'loading' ? '지도를 불러오고 있어요' : '지도를 불러오지 못했어요'}</h3>
        <p>{!appKey ? '일정과 진단 결과는 아래에서 확인할 수 있어요.' : status === 'loading' ? '확인된 경로와 방문 장소를 표시합니다.' : '네트워크 연결을 확인하고 다시 시도해 주세요. 진단 결과는 그대로 유지됩니다.'}</p>
        {appKey && status === 'error' && <button type="button" className="button" onClick={() => { setStatus('loading'); setAttempt((a) => a + 1) }}>지도 다시 불러오기</button>}
      </div>}
    </div>
    <section className="route-leg-panel" aria-label="구간별 이동시간">
      <div className="route-leg-heading"><label htmlFor={selectId}>구간별 이동시간</label><select id={selectId} aria-label="이동 구간 선택" value={selectedId ?? ''} onChange={(event) => setSelectedId(event.target.value || null)}>
        <option value="">구간 선택</option>{data.legs.map((leg) => <option key={leg.id} value={leg.id}>{leg.order === 1 ? '출발' : leg.order - 1} → {leg.order}{leg.seconds === null ? ' · 확인 불가' : ''}</option>)}
      </select></div>
      <div aria-live="polite" aria-atomic="true">{selected ? <>
        <div className="route-leg-time"><span>자동차 이동</span><strong data-testid="route-leg-duration">{selected.seconds === null ? '이동시간 확인 불가' : formatDuration(selected.seconds)}</strong></div>
        <p className="route-leg-places">{selected.fromName}<span aria-hidden="true"> → </span>{selected.toName}</p>
      </> : <p className="route-leg-hint">지도에서 장소 번호를 누르거나 구간을 선택해 주세요.</p>}</div>
    </section>
    <p className="field-help">지도를 끌어서 이동하고 확대·축소할 수 있어요. ‘전체 경로’로 돌아오세요.</p>
  </>
}
