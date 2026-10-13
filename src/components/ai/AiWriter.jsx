import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiZap, FiX, FiCheck, FiRefreshCw } from 'react-icons/fi'
import { adsApi } from '@/components/meta/adsApi'

/**
 * "Write with AI" panel (F-132 / F-119): captions, hashtags, ad copy and reply suggestions from
 * POST /api/ai/content. The server applies the network's length / hashtag rules and the brand voice;
 * the user picks a suggestion and it is copied into the form (nothing is published automatically).
 *
 * props: kind (caption | hashtags | ad_copy | reply), network, networks? [[value, label]],
 *        context() -> { topic?, details?, current_text?, thread? }, clientId?, onUse(variant), label?
 */
export const NETWORK_LABEL = {
    facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X (Twitter)', tiktok: 'TikTok',
    google_business: 'Google Business', meta_ads: 'Meta ad', messenger: 'Messenger', website_chat: 'Website chat', email: 'Email',
}

export const aiErrorText = (e) => {
    if (e?.code === 'AI_CREDITS_EXHAUSTED' || e?.code === 'AI_NOT_CONFIGURED') return <>{e.message} <Link to="/settings/ai">Open AI settings</Link></>
    if (e?.code === 'FEATURE_NOT_ENABLED') return 'AI is not enabled for your workspace.'
    if (e?.code === 'PERMISSION_DENIED') return 'Your role does not allow using AI.'
    return e?.message || 'The AI request failed.'
}

const AiWriter = ({ kind, network: initialNetwork, networks, context, clientId, onUse, label = 'Write with AI', testId = 'ai-writer' }) => {
    const [open, setOpen] = useState(false)
    const [network, setNetwork] = useState(initialNetwork)
    const [topic, setTopic] = useState('')
    const [voices, setVoices] = useState(null)
    const [voice, setVoice] = useState('')
    const [count, setCount] = useState(3)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)
    const [result, setResult] = useState(null)

    useEffect(() => { setNetwork(initialNetwork) }, [initialNetwork])
    useEffect(() => {
        if (!open || voices) return
        adsApi('/api/ai/brand-voices').then((r) => setVoices(r.data || [])).catch(() => setVoices([]))
        const c = context ? context() : {}
        if (!topic && c.topic) setTopic(c.topic)
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    const generate = async () => {
        setBusy(true); setError(null)
        try {
            const c = context ? context() : {}
            const body = {
                kind, network, count,
                ...(topic.trim() ? { topic: topic.trim() } : {}),
                ...(c.details ? { details: String(c.details).slice(0, 3000) } : {}),
                ...(c.current_text && c.current_text.trim() ? { current_text: c.current_text.slice(0, 5000) } : {}),
                ...(c.thread?.length ? { thread: c.thread.slice(-20).map((m) => ({ from: m.from, text: String(m.text || '').slice(0, 2000) })) } : {}),
                ...(voice ? { brand_voice_id: Number(voice) } : {}),
                ...(clientId ? { client_id: Number(clientId) } : {}),
            }
            const r = await adsApi('/api/ai/content', { method: 'POST', body })
            setResult(r.data)
        } catch (e) {
            setError(e)
        } finally {
            setBusy(false)
        }
    }

    if (!open) {
        return (
            <button type="button" className="btn btn-sm btn-light-brand" onClick={() => setOpen(true)} data-testid={testId}>
                <FiZap className="me-1" />{label}
            </button>
        )
    }
    return (
        <div className="border rounded p-3 mb-3 bg-light" data-testid={`${testId}-panel`}>
            <div className="d-flex justify-content-between align-items-center mb-2">
                <strong className="fs-13"><FiZap className="me-1 text-primary" />{label}</strong>
                <button type="button" className="btn btn-sm btn-link p-0 text-muted" onClick={() => setOpen(false)} aria-label="Close AI panel"><FiX /></button>
            </div>
            {kind !== 'reply' && (
                <div className="mb-2">
                    <label className="form-label fs-12 mb-1" htmlFor={`${testId}-topic`}>What is it about?</label>
                    <textarea id={`${testId}-topic`} className="form-control form-control-sm" rows={2} maxLength={500} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Weekend offer: 20% off all cakes, Saturday and Sunday" />
                    <div className="fs-11 text-muted mt-1">The AI only uses what you write here (and the current text). Check facts and prices before publishing.</div>
                </div>
            )}
            <div className="row g-2 align-items-end mb-2">
                {networks && (
                    <div className="col-sm-4">
                        <label className="form-label fs-12 mb-1" htmlFor={`${testId}-network`}>For</label>
                        <select id={`${testId}-network`} className="form-select form-select-sm" value={network} onChange={(e) => setNetwork(e.target.value)}>
                            {networks.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>
                )}
                <div className="col-sm-4">
                    <label className="form-label fs-12 mb-1" htmlFor={`${testId}-voice`}>Brand voice</label>
                    <select id={`${testId}-voice`} className="form-select form-select-sm" value={voice} onChange={(e) => setVoice(e.target.value)}>
                        <option value="">Automatic</option>
                        {(voices || []).map((v) => <option key={v.brand_voice_id} value={v.brand_voice_id}>{v.name}{v.client ? ` (${v.client.company_name})` : ''}</option>)}
                    </select>
                </div>
                <div className="col-sm-2">
                    <label className="form-label fs-12 mb-1" htmlFor={`${testId}-count`}>Options</label>
                    <select id={`${testId}-count`} className="form-select form-select-sm" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
                <div className="col-sm-2 d-grid">
                    <button type="button" className="btn btn-sm btn-primary" onClick={generate} disabled={busy || (kind !== 'reply' && !topic.trim() && !(context && context().current_text))} data-testid={`${testId}-generate`}>
                        {busy ? <span className="spinner-border spinner-border-sm" /> : result ? <FiRefreshCw /> : 'Generate'}
                    </button>
                </div>
            </div>
            {error && <div className="alert alert-warning fs-13 py-2 mb-2" role="alert">{aiErrorText(error)}</div>}
            {result && (
                <div className="d-flex flex-column gap-2" data-testid={`${testId}-results`}>
                    {result.brand_voice && <div className="fs-11 text-muted">Voice: {result.brand_voice.name}</div>}
                    {result.variants.map((v, i) => (
                        <div key={i} className="bg-white border rounded p-2" data-testid={`${testId}-variant`}>
                            {v.headline !== undefined && <div className="fw-semibold fs-13">{v.headline} <span className="fs-11 text-muted fw-normal">({v.headline.length}/{v.headline_ideal} headline)</span></div>}
                            {kind !== 'hashtags' && <div className="fs-13" style={{ whiteSpace: 'pre-line' }}>{v.text}</div>}
                            {v.description && <div className="fs-12 text-muted">{v.description} ({v.description.length}/{v.description_ideal})</div>}
                            {v.hashtags?.length > 0 && <div className="fs-12 text-primary mt-1">{v.hashtags.join(' ')}</div>}
                            <div className="d-flex justify-content-between align-items-center mt-1">
                                <span className={`fs-11 ${v.over_ideal ? 'text-warning' : 'text-muted'}`}>
                                    {v.length} characters{v.max_length ? ` · limit ${v.max_length}` : ''}{v.over_ideal ? ` · longer than the ideal ${v.ideal_length}` : ''}{v.trimmed ? ' · shortened to fit' : ''}
                                </span>
                                <button type="button" className="btn btn-sm btn-success" onClick={() => { onUse(v); }} data-testid={`${testId}-use`}><FiCheck className="me-1" />Use</button>
                            </div>
                        </div>
                    ))}
                    <div className="fs-11 text-muted">AI-written suggestions - review before you publish or send.</div>
                </div>
            )}
        </div>
    )
}

export default AiWriter
