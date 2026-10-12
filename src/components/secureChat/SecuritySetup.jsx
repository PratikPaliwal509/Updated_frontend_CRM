import React, { useEffect, useRef, useState } from 'react'
import { FiLock, FiKey, FiSmartphone, FiAlertTriangle, FiCopy, FiDownload } from 'react-icons/fi'
import { toast } from 'react-toastify'

/** Shows the recovery key once, with copy / download, and asks the user to confirm they saved it. */
export const RecoveryKeyCard = ({ recoveryKey, onDone, title = 'Save your recovery key' }) => {
    const [saved, setSaved] = useState(false)
    const download = () => {
        const blob = new Blob([`Techleela secure chat recovery key\n\n${recoveryKey}\n\nKeep this private. It unlocks your encrypted messages on a new device.\n`], { type: 'text/plain' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'techleela-recovery-key.txt'
        a.click()
        URL.revokeObjectURL(a.href)
    }
    return (
        <div className="card card-body" data-testid="recovery-key-card">
            <h5 className="d-flex align-items-center gap-2"><FiKey /> {title}</h5>
            <p className="text-muted fs-13">This key unlocks your encrypted messages on a new browser or if you clear this one. It is <strong>not</strong> your password, we do not store it, and nobody can recover it for you.</p>
            <div className="p-3 bg-light rounded font-monospace fs-5 text-center user-select-all" data-testid="recovery-key">{recoveryKey}</div>
            <div className="d-flex gap-2 mt-3">
                <button type="button" className="btn btn-light-brand" onClick={() => { navigator.clipboard?.writeText(recoveryKey); toast.success('Copied') }}><FiCopy className="me-1" /> Copy</button>
                <button type="button" className="btn btn-light-brand" onClick={download}><FiDownload className="me-1" /> Download</button>
            </div>
            <label className="form-check mt-3">
                <input type="checkbox" className="form-check-input" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
                <span className="form-check-label">I have saved my recovery key somewhere safe</span>
            </label>
            <button type="button" className="btn btn-primary mt-3" disabled={!saved} onClick={onDone}>Continue</button>
        </div>
    )
}

/** Emoji comparison step used on both devices. */
export const EmojiCompare = ({ sas, onConfirm, onCancel, busy }) => {
    const emoji = sas?.emoji?.() || []
    return (
        <div data-testid="sas-emoji">
            <p className="fs-13">Check that both devices show the same emoji, in the same order:</p>
            <div className="d-flex flex-wrap gap-3 justify-content-center my-3">
                {emoji.map((e, i) => (
                    <div key={i} className="text-center" style={{ width: 64 }}>
                        <div style={{ fontSize: 32 }}>{e.symbol}</div>
                        <div className="fs-11 text-muted">{e.description}</div>
                    </div>
                ))}
            </div>
            <div className="d-flex gap-2 justify-content-center">
                <button type="button" className="btn btn-success" disabled={busy} onClick={onConfirm}>They match</button>
                <button type="button" className="btn btn-light" disabled={busy} onClick={onCancel}>They don&apos;t match</button>
            </div>
        </div>
    )
}

/**
 * First-use / new-device screens for secure chat.
 */
const SecuritySetup = ({ e2ee }) => {
    const { client, phase, status, error, refresh } = e2ee
    const [busy, setBusy] = useState(false)
    const [recoveryKey, setRecoveryKey] = useState(null)
    const [mode, setMode] = useState('choose') // choose | recovery | link | reset
    const [input, setInput] = useState('')
    const [link, setLink] = useState(null) // { request, sas, state }
    const timer = useRef(null)

    useEffect(() => () => clearInterval(timer.current), [])

    if (phase === 'loading') return <div className="p-5 text-center text-muted"><span className="spinner-border spinner-border-sm me-2" />Starting secure chat...</div>
    if (phase === 'error') return <div className="alert alert-danger m-4" data-testid="e2ee-error"><FiAlertTriangle className="me-2" />{error} Secure chat needs a modern browser with IndexedDB and WebAssembly enabled (it does not work in some private windows).</div>

    const run = async (fn) => {
        setBusy(true)
        try { await fn() } catch (err) { toast.error(err.message) } finally { setBusy(false) }
    }

    if (recoveryKey) return <div className="p-4" style={{ maxWidth: 640 }}><RecoveryKeyCard recoveryKey={recoveryKey} onDone={() => { setRecoveryKey(null); refresh() }} /></div>

    if (phase === 'needs-identity') {
        return (
            <div className="p-4" style={{ maxWidth: 640 }} data-testid="e2ee-setup">
                <div className="card card-body">
                    <h5 className="d-flex align-items-center gap-2"><FiLock /> Turn on end-to-end encrypted chat</h5>
                    <p className="text-muted fs-13 mb-2">Your messages and files are encrypted on this device and can only be read on the devices of the people in the chat. The server and our team cannot read them.</p>
                    <ul className="fs-13 text-muted">
                        <li>We create your encryption keys in this browser.</li>
                        <li>You get a <strong>recovery key</strong> to unlock your messages on other devices. Keep it safe.</li>
                    </ul>
                    <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(async () => setRecoveryKey(await client.setupIdentity()))}>
                        {busy ? 'Creating keys...' : 'Turn on secure chat'}
                    </button>
                </div>
            </div>
        )
    }

    // new device
    const startLink = () => run(async () => {
        const request = await client.requestSelfVerification()
        setLink({ request, sas: null, state: 'waiting' })
        let shown = false
        clearInterval(timer.current)
        timer.current = setInterval(async () => {
            try {
                await client.sync()
                if (request.isCancelled()) { clearInterval(timer.current); setLink(null); toast.error('The other device declined or cancelled.'); return }
                // ready -> start emoji verification; once both sides exchanged keys the emoji appear
                let sas = client.sasOf(request)
                if (!sas && request.isReady()) sas = await client.startSas(request)
                if (sas && !shown && sas.emoji?.()) { shown = true; setLink({ request, sas, state: 'compare' }) }
                if (request.isDone()) {
                    clearInterval(timer.current)
                    setLink({ request, state: 'finishing' })
                    const ok = await client.collectSecretsFromOtherDevice()
                    if (!ok) toast.error('Could not receive the keys from your other device. Try the recovery key instead.')
                    setLink(null)
                    refresh()
                }
            } catch (err) { /* keep polling */ }
        }, 1500)
    })

    return (
        <div className="p-4" style={{ maxWidth: 680 }} data-testid="e2ee-new-device">
            <div className="card card-body">
                <h5 className="d-flex align-items-center gap-2"><FiSmartphone /> Set up secure chat on this browser</h5>
                <p className="text-muted fs-13">Your account already uses end-to-end encrypted chat. Prove this browser is yours to read your messages here.</p>
                {mode === 'choose' && (
                    <div className="d-grid gap-2">
                        <button type="button" className="btn btn-primary" onClick={() => setMode('recovery')}><FiKey className="me-1" /> Use my recovery key</button>
                        <button type="button" className="btn btn-light-brand" onClick={() => { setMode('link'); startLink() }}><FiSmartphone className="me-1" /> Approve from another device I&apos;m signed in on</button>
                        <button type="button" className="btn btn-link text-danger fs-12" onClick={() => setMode('reset')}>I lost my recovery key and all my devices</button>
                    </div>
                )}
                {mode === 'recovery' && (
                    <form onSubmit={(e) => { e.preventDefault(); run(async () => { await client.restoreWithRecoveryKey(input); toast.success('This browser is now trusted. Your history was restored.'); refresh() }) }}>
                        <label className="form-label">Recovery key</label>
                        <textarea className="form-control font-monospace" rows={2} value={input} onChange={(e) => setInput(e.target.value)} placeholder="XXXX XXXX XXXX ..." data-testid="recovery-input" />
                        <div className="d-flex gap-2 mt-3">
                            <button className="btn btn-primary" disabled={busy || !input.trim()}>{busy ? 'Unlocking...' : 'Unlock'}</button>
                            <button type="button" className="btn btn-light" onClick={() => setMode('choose')}>Back</button>
                        </div>
                    </form>
                )}
                {mode === 'link' && (
                    <div>
                        {!link || link.state === 'waiting' ? (
                            <p className="fs-13"><span className="spinner-border spinner-border-sm me-2" />Open the chat on a device where you are already signed in and approve this browser ({client?.displayName}).</p>
                        ) : link.state === 'compare' ? (
                            <EmojiCompare sas={link.sas} busy={busy} onConfirm={() => run(async () => { await client.confirmSas(link.sas); setLink({ ...link, state: 'confirmed' }) })} onCancel={() => run(async () => { await client.cancelVerification(link.sas); clearInterval(timer.current); setLink(null); setMode('choose') })} />
                        ) : <p className="fs-13"><span className="spinner-border spinner-border-sm me-2" />Finishing... keep the other device open.</p>}
                        <button type="button" className="btn btn-light mt-3" onClick={() => { clearInterval(timer.current); setLink(null); setMode('choose') }}>Back</button>
                    </div>
                )}
                {mode === 'reset' && (
                    <div className="alert alert-warning mb-0">
                        <p className="fs-13 mb-2"><strong>Reset secure chat?</strong> You will get a new security key. Messages sent to you before now cannot be read any more, and your contacts will see that your security key changed. For safety this must be done within 10 minutes of signing in.</p>
                        <div className="d-flex gap-2">
                            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => run(async () => setRecoveryKey(await client.setupIdentity({ reset: true })))}>Reset and create new keys</button>
                            <button type="button" className="btn btn-light" onClick={() => setMode('choose')}>Cancel</button>
                        </div>
                    </div>
                )}
                {status?.devices?.length > 1 && <p className="fs-11 text-muted mt-3 mb-0">Your devices: {status.devices.map((d) => d.display_name).join(', ')}</p>}
            </div>
        </div>
    )
}

export default SecuritySetup
