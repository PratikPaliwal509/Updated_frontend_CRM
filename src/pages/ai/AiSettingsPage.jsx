import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import { FiCpu, FiKey, FiCheckCircle, FiTrash2, FiEdit3, FiPlus } from 'react-icons/fi'
import PerfectScrollbar from 'react-perfect-scrollbar'
import Footer from '@/components/shared/Footer'
import { adsApi } from '@/components/meta/adsApi'
import { api } from '@/utils/authSession'

/**
 * Settings → AI: which Gemini key pays (platform credit or the workspace's own key), model,
 * this month's usage, and brand voices used by AI content / replies.
 */
const FEATURE = { chatbot: 'Website chatbot', reply: 'Suggested replies', content: 'Content writing', insights: 'Report summaries', test: 'Key tests' }
const EMPTY_VOICE = { name: '', client_id: '', tone: '', audience: '', language: '', use_words: '', avoid_words: '', emoji: 'some', extra_instructions: '', is_default: false }
const fmt = (n) => Number(n || 0).toLocaleString()

const AiSettingsPage = () => {
    const [s, setS] = useState(null)
    const [mode, setMode] = useState('platform')
    const [ownKey, setOwnKey] = useState('')
    const [model, setModel] = useState('')
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [voices, setVoices] = useState([])
    const [clients, setClients] = useState([])
    const [voice, setVoice] = useState(null) // edited voice (object) or null

    const load = useCallback(async () => {
        try {
            const r = await adsApi('/api/ai/settings')
            setS(r.data); setMode(r.data.key_mode); setModel(r.data.model || '')
            setVoices((await adsApi('/api/ai/brand-voices')).data)
        } catch (e) { toast.error(e.message) }
    }, [])
    useEffect(() => { load() }, [load])
    useEffect(() => { api('/api/clients').then((r) => setClients(Array.isArray(r) ? r : r?.clients || r?.data || [])).catch(() => setClients([])) }, [])

    const save = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const body = { key_mode: mode, model: model || null, ...(ownKey.trim() ? { own_key: ownKey.trim() } : {}) }
            const r = await adsApi('/api/ai/settings', { method: 'PUT', body })
            setS(r.data); setOwnKey('')
            toast.success('AI settings saved')
        } catch (err) { toast.error(err.message) } finally { setSaving(false) }
    }
    const test = async () => {
        setTesting(true)
        try {
            const r = await adsApi('/api/ai/settings/test', { method: 'POST' })
            toast.success(`The ${r.data.key_source === 'own' ? 'workspace' : 'platform'} key works (${r.data.model})`)
            load()
        } catch (err) { toast.error(err.message) } finally { setTesting(false) }
    }
    const removeKey = async () => {
        const ok = await Swal.fire({ title: 'Remove your Gemini key?', text: 'AI will use the platform credit again.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Remove' })
        if (!ok.isConfirmed) return
        try { const r = await adsApi('/api/ai/settings/own-key', { method: 'DELETE' }); setS(r.data); setMode('platform'); toast.success('Key removed') } catch (err) { toast.error(err.message) }
    }
    const saveVoice = async (e) => {
        e.preventDefault()
        const body = { ...voice, client_id: voice.client_id ? Number(voice.client_id) : null }
        Object.keys(body).forEach((k) => { if (body[k] === '') body[k] = null })
        delete body.brand_voice_id; delete body.client; delete body.agency_id; delete body.created_at; delete body.updated_at
        try {
            if (voice.brand_voice_id) await adsApi(`/api/ai/brand-voices/${voice.brand_voice_id}`, { method: 'PUT', body })
            else await adsApi('/api/ai/brand-voices', { method: 'POST', body })
            toast.success('Brand voice saved'); setVoice(null); load()
        } catch (err) { toast.error(err.message) }
    }
    const deleteVoice = async (v) => {
        const ok = await Swal.fire({ title: `Delete "${v.name}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete' })
        if (!ok.isConfirmed) return
        try { await adsApi(`/api/ai/brand-voices/${v.brand_voice_id}`, { method: 'DELETE' }); load() } catch (err) { toast.error(err.message) }
    }

    const c = s?.credits
    const pct = c && c.limit ? Math.min(100, Math.round((c.used / c.limit) * 100)) : 0
    const field = (k, label, props = {}) => (
        <div className={props.col || 'col-md-6'}>
            <label className="form-label fs-12 mb-1" htmlFor={`bv-${k}`}>{label}</label>
            <input id={`bv-${k}`} className="form-control form-control-sm" value={voice[k] || ''} maxLength={props.max || 300} onChange={(e) => setVoice({ ...voice, [k]: e.target.value })} placeholder={props.ph || ''} />
        </div>
    )

    return (
        <div className="content-area">
            <PerfectScrollbar>
                <div className="page-header">
                    <div className="page-header-left"><h5 className="m-b-10 mb-0">AI</h5></div>
                </div>
                <div className="content-area-body">
                <div className="row">
                    <div className="col-xl-7">
                        <div className="card mb-4">
                            <div className="card-header"><h6 className="mb-0"><FiCpu className="me-2" />AI provider (Google Gemini)</h6></div>
                            {!s ? <div className="card-body text-muted">Loading...</div> : (
                                <form className="card-body" onSubmit={save} data-testid="ai-settings-form">
                                    <div className="form-check mb-2">
                                        <input className="form-check-input" type="radio" id="mode-platform" checked={mode === 'platform'} onChange={() => setMode('platform')} />
                                        <label className="form-check-label" htmlFor="mode-platform">
                                            <strong>Platform AI</strong> - included credit of {fmt(c?.limit)} tokens per month
                                            {!s.platform_available && <span className="badge bg-soft-warning text-warning ms-2">not set up on this platform</span>}
                                        </label>
                                    </div>
                                    <div className="form-check mb-3">
                                        <input className="form-check-input" type="radio" id="mode-own" checked={mode === 'own'} onChange={() => setMode('own')} />
                                        <label className="form-check-label" htmlFor="mode-own"><strong>Our own Gemini API key</strong> - billed by Google to your account, no monthly limit here</label>
                                    </div>
                                    {mode === 'own' && (
                                        <div className="mb-3">
                                            <label className="form-label fs-12 mb-1" htmlFor="own-key"><FiKey className="me-1" />Gemini API key</label>
                                            <input id="own-key" type="password" autoComplete="off" className="form-control" value={ownKey} onChange={(e) => setOwnKey(e.target.value)}
                                                placeholder={s.has_own_key ? `Saved key ending in ${s.own_key_last4} - leave empty to keep it` : 'Paste the key from Google AI Studio'} />
                                            <div className="fs-11 text-muted mt-1">Stored encrypted. It is never shown again; only the last 4 characters are displayed.</div>
                                        </div>
                                    )}
                                    <div className="mb-3">
                                        <label className="form-label fs-12 mb-1" htmlFor="ai-model">Model</label>
                                        <select id="ai-model" className="form-select" value={model} onChange={(e) => setModel(e.target.value)}>
                                            <option value="">Default ({s.default_model})</option>
                                            {s.models.map((m) => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="d-flex gap-2 flex-wrap">
                                        <button type="submit" className="btn btn-primary" disabled={saving} data-testid="ai-save">Save</button>
                                        <button type="button" className="btn btn-light-brand" onClick={test} disabled={testing} data-testid="ai-test"><FiCheckCircle className="me-1" />{testing ? 'Testing...' : 'Test the key'}</button>
                                        {s.has_own_key && <button type="button" className="btn btn-light-danger" onClick={removeKey}><FiTrash2 className="me-1" />Remove our key</button>}
                                    </div>
                                    <div className="fs-12 text-muted mt-3">Active now: <strong data-testid="ai-active">{s.key_mode === 'own' ? `workspace key ····${s.own_key_last4 || ''}` : 'platform AI'}</strong></div>
                                </form>
                            )}
                        </div>
                    </div>
                    <div className="col-xl-5">
                        <div className="card mb-4">
                            <div className="card-header"><h6 className="mb-0">Usage this month</h6></div>
                            <div className="card-body">
                                {c && (
                                    <>
                                        <div className="d-flex justify-content-between fs-13 mb-1"><span>Platform credit</span><span data-testid="ai-credit">{fmt(c.used)} / {fmt(c.limit)} tokens</span></div>
                                        <div className="progress mb-1" style={{ height: 8 }}><div className={`progress-bar ${pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${pct}%` }} /></div>
                                        <div className="fs-11 text-muted mb-3">Since {c.period_start}. When the credit is used up, AI pauses until next month (the website chatbot hands over to your team).</div>
                                    </>
                                )}
                                <table className="table table-sm mb-0">
                                    <thead><tr><th>Feature</th><th>Key</th><th className="text-end">Calls</th><th className="text-end">Tokens</th></tr></thead>
                                    <tbody>
                                        {(s?.usage || []).length === 0 && <tr><td colSpan={4} className="text-muted text-center fs-13">No AI use yet this month</td></tr>}
                                        {(s?.usage || []).map((u) => <tr key={`${u.feature}-${u.key_source}`} className="fs-13"><td>{FEATURE[u.feature] || u.feature}</td><td>{u.key_source === 'own' ? 'own' : 'platform'}</td><td className="text-end">{fmt(u.calls)}</td><td className="text-end">{fmt(u.tokens)}</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h6 className="mb-0">Brand voices</h6>
                                {!voice && <button type="button" className="btn btn-sm btn-primary" onClick={() => setVoice({ ...EMPTY_VOICE })} data-testid="add-voice"><FiPlus className="me-1" />Add brand voice</button>}
                            </div>
                            <div className="card-body">
                                <p className="fs-12 text-muted">AI content and reply suggestions follow the voice of the client (when one is linked), otherwise the workspace default.</p>
                                {voice && (
                                    <form className="border rounded p-3 mb-3" onSubmit={saveVoice} data-testid="voice-form">
                                        <div className="row g-2">
                                            {field('name', 'Name *', { max: 120, ph: 'e.g. Sunrise Bakery - friendly' })}
                                            <div className="col-md-6">
                                                <label className="form-label fs-12 mb-1" htmlFor="bv-client">Client</label>
                                                <select id="bv-client" className="form-select form-select-sm" value={voice.client_id || ''} onChange={(e) => setVoice({ ...voice, client_id: e.target.value })}>
                                                    <option value="">Whole workspace</option>
                                                    {clients.map((cl) => <option key={cl.client_id} value={cl.client_id}>{cl.company_name}</option>)}
                                                </select>
                                            </div>
                                            {field('tone', 'Tone', { ph: 'warm, witty, never pushy' })}
                                            {field('audience', 'Audience', { ph: 'young families in Pune' })}
                                            {field('language', 'Language', { max: 60, ph: 'English (India)' })}
                                            <div className="col-md-6">
                                                <label className="form-label fs-12 mb-1" htmlFor="bv-emoji">Emoji</label>
                                                <select id="bv-emoji" className="form-select form-select-sm" value={voice.emoji} onChange={(e) => setVoice({ ...voice, emoji: e.target.value })}>
                                                    <option value="none">None</option><option value="some">A few</option><option value="many">Many</option>
                                                </select>
                                            </div>
                                            {field('use_words', 'Words to use', { max: 500 })}
                                            {field('avoid_words', 'Words to avoid', { max: 500 })}
                                            {field('extra_instructions', 'Other rules', { max: 1000, col: 'col-12' })}
                                            <div className="col-12 form-check ms-1">
                                                <input className="form-check-input" type="checkbox" id="bv-default" checked={!!voice.is_default} onChange={(e) => setVoice({ ...voice, is_default: e.target.checked })} />
                                                <label className="form-check-label fs-13" htmlFor="bv-default">Default voice {voice.client_id ? 'for this client' : 'of the workspace'}</label>
                                            </div>
                                        </div>
                                        <div className="mt-3 d-flex gap-2">
                                            <button type="submit" className="btn btn-sm btn-primary" disabled={!voice.name.trim()}>Save voice</button>
                                            <button type="button" className="btn btn-sm btn-light" onClick={() => setVoice(null)}>Cancel</button>
                                        </div>
                                    </form>
                                )}
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0" data-testid="voices">
                                        <thead><tr><th>Voice</th><th>Client</th><th>Tone</th><th>Language</th><th className="text-end">Actions</th></tr></thead>
                                        <tbody>
                                            {voices.length === 0 && <tr><td colSpan={5} className="text-muted text-center fs-13 py-3">No brand voices yet</td></tr>}
                                            {voices.map((v) => (
                                                <tr key={v.brand_voice_id}>
                                                    <td className="fw-semibold">{v.name}{v.is_default && <span className="badge bg-soft-primary text-primary ms-2">default</span>}</td>
                                                    <td className="fs-13">{v.client?.company_name || 'Workspace'}</td>
                                                    <td className="fs-13">{v.tone || '-'}</td>
                                                    <td className="fs-13">{v.language || '-'}</td>
                                                    <td className="text-end text-nowrap">
                                                        <button type="button" className="btn btn-sm btn-light me-2" onClick={() => setVoice({ ...EMPTY_VOICE, ...Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x === null ? '' : x])) })} title="Edit"><FiEdit3 /></button>
                                                        <button type="button" className="btn btn-sm btn-light-danger" onClick={() => deleteVoice(v)} title="Delete"><FiTrash2 /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </PerfectScrollbar>
            <Footer />
        </div>
    )
}

export default AiSettingsPage
