import { useEffect, useState } from 'react'
import type { Place } from './places'

type Field = { label: string; text: string; source: string; checkedAt: string | null; state: string; differs: boolean }

export function VisitDetails({ place }: { place: Place }) {
  const [fields, setFields] = useState<Field[]>([])
  const [status, setStatus] = useState<'loading' | 'AVAILABLE' | 'NOT_COLLECTED' | 'EMPTY' | 'error'>('loading')
  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams({ name: place.name, address: place.address,
      latitude: String(place.latitude), longitude: String(place.longitude) })
    async function load() {
      try {
        const response = await fetch(`/api/places/${encodeURIComponent(place.id)}/detail?${query}`,
          { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
        if (!response.ok) throw new Error()
        const { status, fields: rows } = await response.json()
        if (!['NOT_COLLECTED', 'EMPTY', 'AVAILABLE'].includes(status)) throw new Error()
        if (!Array.isArray(rows) || !rows.every(row => row && typeof row.label === 'string'
          && typeof row.text === 'string' && typeof row.source === 'string'
          && typeof row.state === 'string' && typeof row.differs === 'boolean'
          && (row.checkedAt === null || (typeof row.checkedAt === 'string' && Number.isFinite(Date.parse(row.checkedAt)))))) throw new Error()
        if (!controller.signal.aborted) {
          setFields(rows.filter((field: Field) => field.text.trim()))
          setStatus(status)
        }
      } catch {
        if (!controller.signal.aborted) setStatus('error')
      }
    }
    void load()
    return () => controller.abort()
  }, [place])
  return <>
    {status === 'loading' && <p role="status">방문 정보 조회 중…</p>}
    {status === 'error' && <p role="status">방문 정보를 불러오지 못했습니다.</p>}
    {status === 'NOT_COLLECTED' && <p role="status">아직 수집한 상세정보가 없습니다.</p>}
    {status === 'EMPTY' && <p role="status">수집했지만 표시할 값이 없습니다.</p>}
    <dl className="visit-details">
      {fields.map((field, index) => <div key={index}>
        <dt>{field.label}</dt><dd><span>{field.text}</span>
          <small>{field.source} · {field.checkedAt
            ? <time dateTime={field.checkedAt}>{new Date(field.checkedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 수집 (한국시간)</time>
            : '수집 시각 미확인'}</small>
          {field.differs && <small>출처별 안내가 다릅니다.</small>}
        </dd>
      </div>)}
      {!fields.some(field => field.label === '운영시간') && <div><dt>운영시간</dt><dd>정보 확인 불가</dd></div>}
      <div><dt>장소별 권장 체류시간</dt><dd>근거 정보 없음</dd></div>
    </dl>
  </>
}
