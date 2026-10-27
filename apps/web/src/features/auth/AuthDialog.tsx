import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'

export type Session = { accessToken: string; nickname: string }

export function AuthDialog({ onClose, onAuthenticated, expired = false }: { onClose: () => void; onAuthenticated: (session: Session) => void; expired?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const request = useRef<AbortController | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { request.current?.abort(); request.current = null; element.close(); document.body.style.overflow = previous }
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    setBusy(true); setError('')
    let accountCreated = false
    try {
      const options = { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, signal: controller.signal }
      if (mode === 'signup') {
        const created = await fetch('/api/user/signup', { ...options, body: JSON.stringify({ email: email.trim(), password, nickname: nickname.trim() }) })
        if (!created.ok) throw new Error('signup')
        accountCreated = true
      }
      const response = await fetch('/api/user/login', { ...options, body: JSON.stringify({ email: email.trim(), password }) })
      if (!response.ok) throw new Error('login')
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || !('accessToken' in data) || typeof data.accessToken !== 'string' || !data.accessToken.trim() || !('nickname' in data) || typeof data.nickname !== 'string' || !data.nickname.trim()) throw new Error('response')
      setPassword('')
      onAuthenticated({ accessToken: data.accessToken, nickname: data.nickname })
    } catch {
      if (controller.signal.aborted && !dialog.current?.open) return
      if (accountCreated) {
        setMode('login')
        setError('가입은 완료됐어요. 이메일과 비밀번호로 다시 로그인해 주세요.')
      } else setError(mode === 'signup' ? '가입하지 못했어요. 입력한 정보와 이메일 중복 여부를 확인한 뒤 다시 시도해 주세요.' : '로그인하지 못했어요. 이메일·비밀번호와 서버 연결을 확인한 뒤 다시 시도해 주세요.')
    } finally {
      window.clearTimeout(timeout)
      if (request.current === controller) { request.current = null; setBusy(false) }
    }
  }

  return <dialog ref={dialog} className="place-dialog auth-dialog" aria-labelledby="auth-title" onCancel={onClose}>
    <div className="dialog-top"><span>일정 진단</span><button type="button" className="icon-button" aria-label="로그인 닫기" onClick={onClose}><Icon name="close" /></button></div>
    <div className="dialog-content">
      <p className="eyebrow">입력한 일정은 그대로 유지돼요</p>
      <h2 id="auth-title">{mode === 'login' ? '로그인하고 진단하기' : '가입하고 진단하기'}</h2>
      <p className="field-help">{expired ? '로그인이 만료됐어요. 다시 로그인하면 입력한 일정으로 진단할 수 있어요.' : '일정 진단은 로그인 후 이용할 수 있어요.'}</p>
      <form onSubmit={submit}>
        <fieldset className="plain-fieldset" disabled={busy}>
          <label className="field">이메일<input required name="email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="field">비밀번호<input required name="password" type="password" minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {mode === 'signup' && <label className="field">닉네임<input required name="nickname" autoComplete="nickname" maxLength={50} value={nickname} onChange={(e) => setNickname(e.target.value)} /></label>}
          <button className="button primary" type="submit">{busy ? '확인하고 있어요…' : mode === 'login' ? '로그인하고 진단하기' : '가입하고 진단하기'}</button>
        </fieldset>
        {error && <p className="request-error" role="alert">{error}</p>}
      </form>
      <button type="button" className="button auth-switch" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setPassword('') }}>{mode === 'login' ? '처음이신가요? 회원가입' : '이미 계정이 있나요? 로그인'}</button>
      <p className="field-help">일정과 로그인은 현재 화면을 사용하는 동안만 유지돼요. 새로고침하면 초기화됩니다.</p>
    </div>
  </dialog>
}
