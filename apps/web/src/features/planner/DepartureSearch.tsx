import { useEffect, useRef, useState } from 'react'
import { searchPlaces } from '../places/places'
import type { Place } from '../places/places'
import { busanStation } from './planner'
import type { Departure } from './planner'

export function DepartureSearch({ value, onChange }: { value: Departure; onChange: (value: Departure) => void }) {
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  async function search() {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const timer = window.setTimeout(() => controller.abort(), 15000)
    setStatus('loading')
    setPlaces([])
    try {
      const result = await searchPlaces(query, 1, controller.signal)
      if (request.current === controller) { setPlaces(result); setStatus('success') }
    } catch {
      if (request.current === controller) setStatus('error')
    } finally { window.clearTimeout(timer) }
  }
  return <div className="departure-search">
    <p className="departure-current"><span>선택한 출발지</span><strong>{value.name}</strong></p>
    <button type="button" className="button" onClick={() => onChange(busanStation)}>부산역에서 출발</button>
    <label className="field" htmlFor="departure-query">다른 출발지 검색</label>
      <div className="departure-query"><input id="departure-query" value={query} maxLength={100}
        onChange={(e) => setQuery(e.target.value)} placeholder="관광지 이름"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void search() } }} />
        <button className="button" type="button" onClick={() => void search()}>찾기</button></div>
    <p className="field-help">부산 관광지 검색 결과에서 선택할 수 있어요. 첫 페이지 최대 20곳을 표시해요.</p>
    <div aria-live="polite">
      {status === 'loading' && <p className="field-help">출발지를 찾고 있어요.</p>}
      {status === 'error' && <p className="field-error">출발지 검색에 실패했어요. 다시 찾아 주세요.</p>}
      {status === 'success' && !places.length && <p className="field-help">이 페이지에는 표시할 출발지가 없어요. 다른 검색어로 찾아보세요.</p>}
    </div>
    {!!places.length && <ul className="departure-results">{places.map((place) => <li key={place.id}>
      <button type="button" onClick={() => { onChange({ name: place.name, latitude: place.latitude, longitude: place.longitude }); setPlaces([]); setStatus('idle') }}>
        <strong>{place.name}</strong><span>{place.address || '주소 정보 없음'}</span>
      </button>
    </li>)}</ul>}
  </div>
}
