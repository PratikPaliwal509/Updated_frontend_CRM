import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiImage, FiVideo, FiX, FiSend, FiClock, FiLink, FiFacebook } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import usePages from '@/components/meta/usePages'
import { ConnectHint, metaErrorText } from '@/components/meta/PagePicker'
import { api } from '@/utils/authSession'

const MAX_IMAGES = 10

/** Upload a photo / video for a post with a server-signed request (folder of this workspace). */
const uploadMedia = async (file, kind) => {
    const sig = await api('/api/social/media-signature', { method: 'POST', body: { kind } })
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!sig.allowed_formats.includes(ext)) throw new Error(`Use a ${sig.allowed_formats.join(' / ')} file`)
    if (file.size > sig.max_bytes) throw new Error(`Files can be at most ${Math.round(sig.max_bytes / 1048576)} MB`)
    const form = new FormData()
    Object.entries(sig.params).forEach(([k, v]) => form.append(k, v))
    form.append('file', file)
    const res = await fetch(sig.upload_url, { method: 'POST', body: form })
    const up = await res.json().catch(() => ({}))
    if (!res.ok || !up.secure_url) throw new Error(up.error?.message || 'Upload failed')
    return { type: kind, url: up.secure_url }
}

const localInput = (d) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 16) }

/** Compose a Facebook post for one or more Pages: now or scheduled; text, link, photos or a video. */
const ComposePostPage = () => {
    const navigate = useNavigate()
    const { pages, loading, error, notConnected } = usePages()
    const usable = pages.filter((p) => p.status === 'active')
    const [chosen, setChosen] = useState([])
    const [message, setMessage] = useState('')
    const [link, setLink] = useState('')
    const [media, setMedia] = useState([])
    const [uploading, setUploading] = useState(false)
    const [schedule, setSchedule] = useState(false)
    const [when, setWhen] = useState(() => localInput(new Date(Date.now() + 3600 * 1000)))
    const [saving, setSaving] = useState(false)

    const toggle = (id) => setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    const hasVideo = media.some((m) => m.type === 'video')

    const onFiles = async (e, kind) => {
        const files = [...(e.target.files || [])]
        e.target.value = ''
        if (!files.length) return
        if (kind === 'video' && (media.length || files.length > 1)) return toast.error('A post can have one video and no photos')
        if (kind === 'image' && (hasVideo || media.length + files.length > MAX_IMAGES)) return toast.error(`Up to ${MAX_IMAGES} photos, or one video`)
        setUploading(true)
        try {
            for (const f of files) {
                const m = await uploadMedia(f, kind)
                setMedia((prev) => [...prev, m])
            }
        } catch (err) {
            toast.error(err.message)
        } finally {
            setUploading(false)
        }
    }

    const submit = async (e) => {
        e.preventDefault()
        if (!chosen.length) return toast.error('Choose at least one Page')
        if (!message.trim() && !media.length) return toast.error('Write something or add a photo / video')
        if (link && media.length) return toast.error('A Facebook post can have a link or photos / video, not both')
        const scheduledAt = schedule ? new Date(when) : null
        if (schedule && (!when || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 60000)) return toast.error('Pick a time at least a minute from now')
        setSaving(true)
        try {
            const post = await api('/api/social/posts', {
                method: 'POST',
                body: { message, link: link.trim() || null, media, page_ids: chosen, scheduled_at: scheduledAt ? scheduledAt.toISOString() : null },
            })
            toast.success(post.scheduled_at ? `Scheduled for ${new Date(post.scheduled_at).toLocaleString()}` : 'Publishing - you can follow the status here')
            navigate('/meta/posts/scheduled')
        } catch (err) {
            toast.error(metaErrorText(err))
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <PageHeader>
                <div className="d-flex align-items-center justify-content-between w-100">
                    <div>
                        <h5 className="mb-1">Create Facebook post</h5>
                        <p className="fs-12 text-muted mb-0">Publish now or schedule, to one or several Pages</p>
                    </div>
                </div>
            </PageHeader>
            <div className="main-content">
                <div className="row">
                    {notConnected || error ? <ConnectHint error={error} /> : (
                        <form className="col-xl-8" onSubmit={submit} data-testid="compose-form">
                            <div className="card">
                                <div className="card-body">
                                    <label className="form-label fw-semibold">Pages</label>
                                    {loading && <div className="text-muted fs-13 mb-3">Loading Pages...</div>}
                                    <div className="d-flex flex-wrap gap-2 mb-4">
                                        {usable.map((p) => (
                                            <label key={p.meta_page_id} className={`btn btn-sm ${chosen.includes(p.meta_page_id) ? 'btn-primary' : 'btn-light-brand'}`}>
                                                <input type="checkbox" className="d-none" checked={chosen.includes(p.meta_page_id)} onChange={() => toggle(p.meta_page_id)} aria-label={p.name} />
                                                <FiFacebook className="me-1" />{p.name}{p.client ? ` · ${p.client.company_name}` : ''}
                                            </label>
                                        ))}
                                        {!loading && usable.length === 0 && <span className="text-muted fs-13">No usable Page - check Settings → Integrations.</span>}
                                    </div>

                                    <label className="form-label fw-semibold" htmlFor="post-message">Text</label>
                                    <textarea id="post-message" className="form-control mb-1" rows={6} value={message} maxLength={63206} onChange={(e) => setMessage(e.target.value)} placeholder="What do you want to share?" />
                                    <div className="fs-11 text-muted text-end mb-3">{message.length} characters</div>

                                    <label className="form-label fw-semibold" htmlFor="post-link"><FiLink className="me-1" />Link (optional)</label>
                                    <input id="post-link" className="form-control mb-4" type="url" value={link} disabled={media.length > 0} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />

                                    <label className="form-label fw-semibold">Photos or video (optional)</label>
                                    <div className="d-flex flex-wrap gap-2 mb-2">
                                        {media.map((m, i) => (
                                            <div key={m.url} className="position-relative border rounded" style={{ width: 110, height: 110, overflow: 'hidden' }}>
                                                {m.type === 'image' ? <img src={m.url} alt="" className="w-100 h-100" style={{ objectFit: 'cover' }} /> : <video src={m.url} className="w-100 h-100" muted />}
                                                <button type="button" className="btn btn-sm btn-light position-absolute top-0 end-0 m-1 p-1" aria-label="Remove" onClick={() => setMedia(media.filter((_, j) => j !== i))}><FiX /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="d-flex gap-2 mb-4">
                                        <label className={`btn btn-light-brand btn-sm ${uploading || hasVideo || link ? 'disabled' : ''}`}>
                                            <FiImage className="me-1" />Add photos
                                            <input type="file" className="d-none" accept="image/png,image/jpeg,image/webp,image/gif" multiple disabled={uploading || hasVideo || !!link} onChange={(e) => onFiles(e, 'image')} data-testid="add-photos" />
                                        </label>
                                        <label className={`btn btn-light-brand btn-sm ${uploading || media.length || link ? 'disabled' : ''}`}>
                                            <FiVideo className="me-1" />Add video
                                            <input type="file" className="d-none" accept="video/mp4,video/quicktime" disabled={uploading || media.length > 0 || !!link} onChange={(e) => onFiles(e, 'video')} />
                                        </label>
                                        {uploading && <span className="fs-12 text-muted align-self-center">Uploading...</span>}
                                    </div>

                                    <div className="form-check form-switch mb-2">
                                        <input id="schedule" className="form-check-input" type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} />
                                        <label className="form-check-label" htmlFor="schedule"><FiClock className="me-1" />Schedule for later</label>
                                    </div>
                                    {schedule && (
                                        <input type="datetime-local" className="form-control mb-3" style={{ maxWidth: 260 }} value={when} min={localInput(new Date(Date.now() + 120000))} onChange={(e) => setWhen(e.target.value)} aria-label="Publish at" />
                                    )}
                                </div>
                                <div className="card-footer d-flex justify-content-end gap-2">
                                    <button type="button" className="btn btn-light" onClick={() => navigate(-1)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
                                        {schedule ? <FiClock className="me-2" /> : <FiSend className="me-2" />}
                                        {saving ? 'Saving...' : schedule ? 'Schedule post' : 'Publish now'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                    {!notConnected && !error && (
                        <div className="col-xl-4">
                            <div className="card">
                                <div className="card-header"><h6 className="mb-0">Preview</h6></div>
                                <div className="card-body">
                                    <div className="fs-13 fw-semibold mb-2">{usable.find((p) => p.meta_page_id === chosen[0])?.name || 'Your Page'}</div>
                                    <p className="fs-13" style={{ whiteSpace: 'pre-line' }}>{message || <span className="text-muted">Your text...</span>}</p>
                                    {media[0]?.type === 'image' && <img src={media[0].url} alt="" className="w-100 rounded" />}
                                    {media.length > 1 && <div className="fs-11 text-muted mt-1">+{media.length - 1} more photos</div>}
                                    {link && <div className="border rounded p-2 fs-12 text-primary text-truncate">{link}</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    )
}

export default ComposePostPage
