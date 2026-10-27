import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import type { DiagnosisSnapshot, Segment } from './diagnosis'
import { createRouteMapDocument, routeMapData } from './route-map'

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
  const source = useMemo(() => createRouteMapDocument(appKey, data), [appKey, data])
  useEffect(() => {
    const timer = window.setTimeout(() => setStatus('error'), 25000)
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || ![window.location.origin, 'null'].includes(event.origin) || event.data?.channel !== 'busanfit-route-map') return
      if (event.data.state === 'error') { clearTimeout(timer); setStatus('error') }
      if (event.data.state === 'ready') { clearTimeout(timer); setStatus((current) => current === 'error' ? current : 'ready') }
    }
    window.addEventListener('message', receive)
    return () => { clearTimeout(timer); window.removeEventListener('message', receive) }
  }, [attempt])
  return <>
    <div className="route-map-shell">
      {appKey && <iframe key={attempt} ref={frame} title="일정 경로 지도" srcDoc={source} sandbox="allow-scripts allow-same-origin" className="route-map-frame" />}
      {(!appKey || status !== 'ready') && <div className="route-map-message" role="status">
        <Icon name="pin" /><h3>{!appKey ? '지도 연결 설정이 필요해요' : status === 'loading' ? '지도를 불러오고 있어요' : '지도를 불러오지 못했어요'}</h3>
        <p>{!appKey ? '일정과 진단 결과는 아래에서 확인할 수 있어요.' : status === 'loading' ? '확인된 경로와 방문 장소를 표시합니다.' : '네트워크 연결을 확인하고 다시 시도해 주세요. 진단 결과는 그대로 유지됩니다.'}</p>
        {appKey && status === 'error' && <button type="button" className="button" onClick={() => { setStatus('loading'); setAttempt((a) => a + 1) }}>지도 다시 불러오기</button>}
      </div>}
    </div>
    <p className="field-help">지도를 끌어서 이동하고 확대·축소할 수 있어요. ‘전체 경로’로 돌아오세요.</p>
  </>
}
