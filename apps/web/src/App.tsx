import { PlaceSearchPage } from './features/places/PlaceSearchPage'
import { useEffect, useState } from 'react'
import { PlannerPage } from './features/planner/PlannerPage'
import { initialTrip, newStop } from './features/planner/planner'
import type { StopDraft } from './features/planner/planner'

export default function App() {
  const [screen, setScreen] = useState<'search' | 'planner'>('search')
  const [stops, setStops] = useState<StopDraft[]>([])
  const [trip, setTrip] = useState(initialTrip)
  useEffect(() => {
    document.title = screen === 'search' ? '장소 선택 · BusanFit' : '순서·시간 설정 · BusanFit'
    document.querySelector<HTMLElement>(screen === 'search' ? '#main h1' : '#planner-main h1')?.focus()
    window.scrollTo(0, 0)
  }, [screen])
  return <>
    <div hidden={screen !== 'search'}>
      <PlaceSearchPage selected={stops.map((s) => s.place)}
        onAdd={(place) => setStops((current) => current.some((s) => s.place.id === place.id) ? current : [...current, newStop(place)])}
        onRemove={(id) => setStops((current) => current.filter((s) => s.place.id !== id))}
        onNext={() => setScreen('planner')} />
    </div>
    {screen === 'planner' && <PlannerPage stops={stops} setStops={setStops} trip={trip} setTrip={setTrip} onBack={() => setScreen('search')} />}
  </>
}
