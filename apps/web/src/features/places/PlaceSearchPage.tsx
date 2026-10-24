import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../components/Icon'
import { PlaceImage } from './PlaceImage'
import { searchPlaces } from './places'
import type { Place } from './places'

type SearchState = {
  status: 'idle' | 'loading' | 'success' | 'error'
  places: Place[]
  keyword: string
  page: number
}

export function PlaceSearchPage({ selected, onAdd, onRemove, onNext }: {
  selected: Place[]
  onAdd: (place: Place) => void
  onRemove: (id: string) => void
  onNext: () => void
}) {
  const [input, setInput] = useState('')
  const [search, setSearch] = useState<SearchState>({
    status: 'idle',
    places: [],
    keyword: '',
    page: 1,
  })
  const [detail, setDetail] = useState<Place | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const request = useRef<AbortController | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const detailTrigger = useRef<HTMLElement | null>(null)

  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => {
    if (detail && !dialog.current?.open) dialog.current?.showModal()
  }, [detail])

  async function runSearch(keyword: string, page = 1) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const timeout = window.setTimeout(() => controller.abort('timeout'), 15000)
    setSearch({ status: 'loading', places: [], keyword: keyword.trim(), page })
    try {
      const places = await searchPlaces(keyword, page, controller.signal)
      if (request.current === controller)
        setSearch({ status: 'success', places, keyword: keyword.trim(), page })
    } catch {
      if (request.current === controller)
        setSearch({
          status: 'error',
          places: [],
          keyword: keyword.trim(),
          page,
        })
    } finally {
      window.clearTimeout(timeout)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void runSearch(input)
  }
  function add(place: Place) {
    onAdd(place)
    setAnnouncement(`${place.name}, 선택한 장소에 추가했습니다.`)
  }
  function remove(place: Place) {
    onRemove(place.id)
    setAnnouncement(`${place.name}, 선택을 해제했습니다.`)
  }
  function openDetail(place: Place) {
    detailTrigger.current = document.activeElement as HTMLElement
    setDetail(place)
  }
  function closeDetail() {
    dialog.current?.close()
    setDetail(null)
    detailTrigger.current?.focus()
  }
  const isSelected = (place: Place) =>
    selected.some((item) => item.id === place.id)

  return (
    <>
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a href="/" className="brand" aria-label="부산핏 장소 선택">
            <span className="brand-mark">
              <Icon name="check" />
            </span>
            busanfit<span className="brand-dot">.</span>
          </a>
          <span className="header-context">여행 일정 만들기</span>
          <span className="header-note">계획을, 가능한 여행으로.</span>
        </div>
      </header>
      <main id="main" className="workspace">
        <ol className="steps" aria-label="일정 만들기 단계">
          <li aria-current="step">
            <span>01</span> 장소 선택
          </li>
          <li>
            <span>02</span> 순서·시간 설정
          </li>
          <li>
            <span>03</span> 일정 진단
          </li>
        </ol>
        <div className="page-heading">
          <div>
            <p className="eyebrow">여행의 시작, 장소 고르기</p>
            <h1 tabIndex={-1}>어디에 가고 싶으세요?</h1>
            <p>
              가고 싶은 장소를 모아보세요.
              <br className="mobile-break" /> 시간과 동선은 다음 단계에서
              살펴볼게요.
            </p>
          </div>
          <span className="region-label">
            <Icon name="pin" />
            부산 관광지
          </span>
        </div>
        <div className="workspace-grid">
          <section className="search-area" aria-label="관광지 검색">
            <form className="search-form" onSubmit={submit} role="search">
              <label className="sr-only" htmlFor="place-query">
                관광지 이름 또는 검색어
              </label>
              <Icon name="search" />
              <input
                id="place-query"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="관광지 이름을 검색해 보세요"
                maxLength={100}
                autoComplete="off"
              />
              <button className="button primary" type="submit">
                검색
              </button>
            </form>
            <div className="search-suggestions">
              <span>검색어 예시</span>
              {['해운대', '감천문화마을', '태종대'].map((word) => (
                <button
                  key={word}
                  onClick={() => {
                    setInput(word)
                    void runSearch(word)
                  }}
                >
                  {word}
                  <Icon name="arrow" />
                </button>
              ))}
            </div>
            <div className="results-heading">
              <h2>
                {search.status === 'idle'
                  ? '부산에서 가고 싶은 곳'
                  : search.keyword
                    ? `“${search.keyword}” 검색 결과`
                    : '부산 관광지 목록'}
              </h2>
              <span>한국관광공사 제공</span>
            </div>
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {search.status === 'loading'
                ? '검색 중입니다.'
                : search.status === 'success'
                  ? `현재 페이지에 ${search.places.length}개 장소가 있습니다.`
                  : ''}
            </div>
            {search.status === 'idle' && (
              <div className="empty-state initial-state">
                <span className="state-icon">
                  <Icon name="search" />
                </span>
                <h3>떠오르는 장소가 있나요?</h3>
                <p>
                  이름으로 검색하거나 부산 관광지를 둘러보세요.
                  <br />
                  마음에 드는 곳을 하나씩 선택할 수 있어요.
                </p>
                <button
                  className="button primary"
                  onClick={() => {
                    setInput('')
                    void runSearch('')
                  }}
                >
                  부산 관광지 둘러보기
                  <Icon name="arrow" />
                </button>
                <span className="state-caption">
                  현재 부산 지역 관광지를 검색할 수 있어요.
                </span>
              </div>
            )}
            {search.status === 'loading' && (
              <div className="empty-state" aria-busy="true">
                <span className="spinner" />
                <h3>관광지를 찾고 있어요</h3>
                <p>장소 정보를 불러오는 중입니다.</p>
              </div>
            )}
            {search.status === 'error' && (
              <div className="empty-state error-state" role="alert">
                <span className="state-icon">
                  <Icon name="info" />
                </span>
                <h3>검색 정보를 불러오지 못했어요</h3>
                <p>
                  일시적으로 연결이 원활하지 않습니다.
                  <br />
                  잠시 후 다시 검색해 주세요.
                </p>
                <button
                  className="button primary"
                  onClick={() => void runSearch(search.keyword, search.page)}
                >
                  다시 시도
                </button>
              </div>
            )}
            {search.status === 'success' && !search.places.length && (
              <div className="empty-state">
                <span className="state-icon">
                  <Icon name="search" />
                </span>
                <h3>이 페이지에 표시할 장소가 없어요</h3>
                <p>다음 페이지를 확인하거나 다른 검색어로 찾아보세요.</p>
              </div>
            )}
            {search.status === 'success' && (
              <>
                <ul className="place-list">
                  {search.places.map((place) => (
                    <li className="place-row" key={place.id}>
                      <button
                        className="place-detail-button"
                        onClick={() => openDetail(place)}
                        aria-label={`${place.name} 상세 보기`}
                      >
                        <PlaceImage
                          key={`${place.id}-${place.imageUrl}`}
                          place={place}
                        />
                        <span className="place-copy">
                          <span className="category">
                            {place.category || '분류 정보 없음'}
                          </span>
                          <strong>{place.name}</strong>
                          <span className="address">
                            <Icon name="pin" />
                            {place.address || '주소 정보 없음'}
                          </span>
                          <span className="detail-link">
                            장소 정보 보기 <Icon name="arrow" />
                          </span>
                        </span>
                      </button>
                      <button
                        className={`button add-button ${isSelected(place) ? 'added' : ''}`}
                        disabled={isSelected(place)}
                        onClick={() => add(place)}
                        aria-label={`${place.name} ${isSelected(place) ? '선택됨' : '추가'}`}
                      >
                        <Icon name={isSelected(place) ? 'check' : 'plus'} />
                        {isSelected(place) ? '선택됨' : '추가'}
                      </button>
                    </li>
                  ))}
                </ul>
                {/* Filtered arrays do not tell us whether the source has more pages. */}
                <nav className="pagination" aria-label="검색 결과 페이지">
                  <button
                    className="button"
                    disabled={search.page === 1}
                    onClick={() =>
                      void runSearch(search.keyword, search.page - 1)
                    }
                  >
                    이전
                  </button>
                  <span>{search.page} 페이지</span>
                  <button
                    className="button"
                    onClick={() =>
                      void runSearch(search.keyword, search.page + 1)
                    }
                  >
                    다음
                  </button>
                </nav>
                <p className="search-footnote">
                  전체 페이지 수는 확인할 수 없어요. 다음 페이지에 장소가 없을
                  수도 있어요.
                </p>
              </>
            )}
            <p className="search-footnote">
              <Icon name="info" />
              장소 선택만으로 방문 가능 여부가 확인되지는 않아요.
            </p>
          </section>
          <aside
            className="selection-panel"
            id="selected-places"
            tabIndex={-1}
            aria-labelledby="selection-heading"
          >
            <div className="selection-title">
              <h2 id="selection-heading">
                선택한 장소 <span>{selected.length}</span>
              </h2>
              <Icon name="list" />
            </div>
            <p className="panel-description">이번 여행에 담아둔 장소예요.</p>
            {selected.length === 0 ? (
              <div className="selection-empty">
                <span className="selection-line">
                  <span>1</span>
                  <i />
                </span>
                <strong>첫 번째 장소를 골라보세요</strong>
                <p>
                  검색 결과에서 <b>+ 추가</b>를 누르면
                  <br />
                  이곳에 선택한 장소가 모여요.
                </p>
              </div>
            ) : (
              <ol className="selected-list">
                {selected.map((place, index) => (
                  <li key={place.id}>
                    <span className="stop-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <button
                      className="selected-name"
                      onClick={() => openDetail(place)}
                      aria-label={`${place.name} 선택 장소 상세`}
                    >
                      <strong>{place.name}</strong>
                      <span>{place.address || '주소 정보 없음'}</span>
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => remove(place)}
                      aria-label={`${place.name} 선택 해제`}
                    >
                      <Icon name="close" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <div className="selection-footer">
              <p>
                <Icon name="info" />
                <span>
                  선택과 입력은 화면을 오가도 유지돼요.
                  <br />
                  새로고침하면 초기화됩니다.
                </span>
              </p>
              <button
                className="button primary next-button"
                disabled={!selected.length}
                onClick={onNext}
                aria-describedby="next-note"
              >
                순서·시간 설정
                <Icon name="arrow" />
              </button>
              <span id="next-note">
                장소별 방문시간과 활동을 설정할 수 있어요.
              </span>
            </div>
          </aside>
        </div>
        <footer className="page-footer">
          <span>busanfit.</span>
          <p>가고 싶은 곳을 연결하고, 가능한 하루를 만들어요.</p>
        </footer>
      </main>
      <a className="mobile-selection-bar" href="#selected-places">
        <span>
          선택한 장소 <b>{selected.length}</b>
        </span>
        <span>
          목록 보기 <Icon name="arrow" />
        </span>
      </a>
      <div className="sr-only" role="status">
        {announcement}
      </div>
      <dialog
        className="place-dialog"
        ref={dialog}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const buttons =
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              'button:not(:disabled)',
            )
          const first = buttons[0]
          const last = buttons[buttons.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
        onCancel={closeDetail}
        onClose={() => {
          if (detail) {
            setDetail(null)
            detailTrigger.current?.focus()
          }
        }}
        aria-labelledby="detail-title"
      >
        {detail && (
          <>
            <div className="dialog-top">
              <span>장소 정보</span>
              <button
                className="icon-button"
                onClick={closeDetail}
                aria-label="장소 정보 닫기"
              >
                <Icon name="close" />
              </button>
            </div>
            <PlaceImage
              key={`${detail.id}-${detail.imageUrl}`}
              place={detail}
            />
            <div className="dialog-content">
              <span className="category">
                {detail.category || '분류 정보 없음'}
              </span>
              <h2 id="detail-title">{detail.name}</h2>
              <p className="address">
                <Icon name="pin" />
                {detail.address || '주소 정보 없음'}
              </p>
              <dl>
                <div>
                  <dt>운영시간</dt>
                  <dd>정보 확인 불가</dd>
                </div>
                <div>
                  <dt>장소별 권장 체류시간</dt>
                  <dd>근거 정보 없음</dd>
                </div>
              </dl>
              <p className="detail-note">
                현재 제공된 정보로는 운영 여부나 방문 가능 여부를 판단할 수
                없어요.
              </p>
              <p className="source-label">장소 정보 · 한국관광공사</p>
              <button
                className="button primary"
                disabled={isSelected(detail)}
                onClick={() => add(detail)}
              >
                <Icon name={isSelected(detail) ? 'check' : 'plus'} />
                {isSelected(detail)
                  ? '선택한 장소에 담겼어요'
                  : '선택한 장소에 추가'}
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  )
}
