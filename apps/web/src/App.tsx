import { PlaceSearchPage } from './features/places/PlaceSearchPage'
import { useEffect, useState } from 'react'
import { PlannerPage } from './features/planner/PlannerPage'
import { initialTrip, newStop } from './features/planner/planner'
import type { StopDraft } from './features/planner/planner'
import { DiagnosisPage } from './features/diagnosis/DiagnosisPage'
import type { Diagnosis, DiagnosisSnapshot } from './features/diagnosis/diagnosis'
import type { Session } from './features/auth/AuthDialog'

export default function App() {
  const [screen, setScreen] = useState<'search' | 'planner' | 'diagnosis'>('search')
  const [stops, setStops] = useState<StopDraft[]>([])
  const [trip, setTrip] = useState(initialTrip)
  const [session, setSession] = useState<Session | null>(null)
  const [diagnosis, setDiagnosis] = useState<{ result: Diagnosis; snapshot: DiagnosisSnapshot } | null>(null)
  useEffect(() => {
    document.title = screen === 'search' ? '장소 선택 · BusanFit' : screen === 'planner' ? '순서·시간 설정 · BusanFit' : '일정 진단 결과 · BusanFit'
    document.querySelector<HTMLElement>(screen === 'search' ? '#main h1' : screen === 'planner' ? '#planner-main h1' : '#diagnosis-main h1')?.focus()
    window.scrollTo(0, 0)
  }, [screen])
  return <>
    <div hidden={screen !== 'search'}>
      <PlaceSearchPage selected={stops.map((s) => s.place)}
        onAdd={(place) => setStops((current) => current.some((s) => s.place.id === place.id) ? current : [...current, newStop(place)])}
        onRemove={(id) => setStops((current) => current.filter((s) => s.place.id !== id))}
        onNext={() => setScreen('planner')} />
    </div>
    {screen === 'planner' && <PlannerPage stops={stops} setStops={setStops} trip={trip} setTrip={setTrip} onBack={() => setScreen('search')}
      session={session} setSession={setSession} onDiagnosed={(result, snapshot) => { setDiagnosis({ result, snapshot }); setScreen('diagnosis') }} />}
    {screen === 'diagnosis' && diagnosis && <DiagnosisPage {...diagnosis} nickname={session?.nickname || '여행자'}
      onEdit={() => setScreen('planner')} onSearch={() => setScreen('search')} onLogout={() => { setSession(null); setDiagnosis(null); setScreen('planner') }} />}
  </>
}
