import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import { FiPlus, FiRefreshCw, FiExternalLink, FiRotateCw, FiXCircle } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'
import { metaErrorText } from '@/components/meta/PagePicker'

const BADGE = {
    scheduled: 'bg-soft-info text-info', publishing: 'bg-soft-warning text-warning', published: 'bg-soft-success text-success',
    partially_failed: 'bg-soft-danger text-danger', failed: 'bg-soft-danger text-danger', cancelled: 'bg-soft-secondary text-secondary',
    queued: 'bg-soft-info text-info',
}
const LABEL = { partially_failed: 'Partly failed', queued: 'Waiting' }
const Badge = ({ s }) => <span className={`badge ${BADGE[s] || 'bg-light text-dark'}`}>{LABEL[s] || s.charAt(0).toUpperCase() + s.slice(1)}</span>
const when = (d) => (d ? new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-')
const FILTERS = [['', 'All'], ['scheduled', 'Scheduled'], ['failed', 'Failed'], ['published', 'Published']]

/** Posts composed in the CRM: schedule, status per Page, errors, retry / cancel. */
const ScheduledPostsPage = () => {
    const [filter, setFilter] = useState('')
    const [data, setData] = useState({ items: [], total: 0 })
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        try { setData(await api(`/api/social/posts?limit=50${filter ? `&status=${filter}` : ''}`)) } catch (e) { toast.error(metaErrorText(e)) } finally { setLoading(false) }
    }, [filter])
    useEffect(() => { load() }, [load])
    // follow posts that are being published
    useEffect(() => {
        if (!data.items.some((p) => p.status === 'publishing')) return undefined
        const t = setTimeout(load, 4000)
        return () => clearTimeout(t)
    }, [data, load])

    const cancel = async (p) => {
        const ok = await Swal.fire({ title: 'Cancel this scheduled post?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Cancel post', cancelButtonText: 'Keep' })
        if (!ok.isConfirmed) return
        try { await api(`/api/social/posts/${p.social_post_id}/cancel`, { method: 'POST' }); toast.success('Scheduled post cancelled'); load() } catch (e) { toast.error(metaErrorText(e)) }
    }
    const retry = async (t) => {
        try { await api(`/api/social/targets/${t.target_id}/retry`, { method: 'POST' }); toast.success('Publishing again'); load() } catch (e) { toast.error(metaErrorText(e)) }
    }

    return (
        <>
            <PageHeader>
                <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
                    <div>
                        <h5 className="mb-1">Scheduled & published posts</h5>
                        <p className="fs-12 text-muted mb-0">Posts created in the CRM, with their status on each Page</p>
                    </div>
                    <div className="d-flex gap-2">
                        <div className="btn-group">
                            {FILTERS.map(([v, l]) => <button key={v} type="button" className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-light-brand'}`} onClick={() => setFilter(v)}>{l}</button>)}
                        </div>
                        <button type="button" className="btn btn-sm btn-light-brand" onClick={load} disabled={loading}><FiRefreshCw /></button>
                        <Link to="/meta/posts/create" className="btn btn-sm btn-primary"><FiPlus className="me-1" />Create post</Link>
                    </div>
                </div>
            </PageHeader>
            <div className="main-content">
                <div className="card">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead><tr><th>Post</th><th>Pages</th><th>When</th><th>Status</th><th>By</th><th className="text-end">Actions</th></tr></thead>
                            <tbody>
                                {!loading && data.items.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">No posts yet.</td></tr>}
                                {data.items.map((p) => (
                                    <React.Fragment key={p.social_post_id}>
                                        <tr data-testid="social-post-row" style={{ cursor: 'pointer' }} onClick={() => setOpen(open === p.social_post_id ? null : p.social_post_id)}>
                                            <td style={{ maxWidth: 360 }}>
                                                <div className="text-truncate fs-13">{p.message || <em className="text-muted">(no text)</em>}</div>
                                                <div className="fs-11 text-muted">{p.media.length ? `${p.media.length} ${p.media[0].type === 'video' ? 'video' : 'photo(s)'}` : p.link ? 'Link' : 'Text'}</div>
                                            </td>
                                            <td className="fs-13">{p.targets.map((t) => t.page.name).join(', ')}</td>
                                            <td className="fs-13">{p.status === 'scheduled' ? when(p.scheduled_at) : when(p.published_at || p.created_at)}</td>
                                            <td><Badge s={p.status} /></td>
                                            <td className="fs-13">{p.creator?.full_name || '-'}</td>
                                            <td className="text-end" onClick={(e) => e.stopPropagation()}>
                                                {p.status === 'scheduled' && <button type="button" className="btn btn-sm btn-light-danger" onClick={() => cancel(p)} title="Cancel"><FiXCircle /></button>}
                                            </td>
                                        </tr>
                                        {open === p.social_post_id && (
                                            <tr><td colSpan={6} className="bg-light">
                                                {p.targets.map((t) => (
                                                    <div key={t.target_id} className="d-flex align-items-start gap-3 py-2 border-bottom" data-testid="target-row">
                                                        <div style={{ minWidth: 180 }} className="fw-semibold fs-13">{t.page.name}</div>
                                                        <div><Badge s={t.status} /></div>
                                                        <div className="flex-grow-1 fs-12">
                                                            {t.last_error && <div className="text-danger mb-1">{t.last_error}</div>}
                                                            <div className="text-muted">{(t.events || []).map((e) => `${when(e.at)} ${e.status}${e.message ? ` (${e.message})` : ''}`).join(' → ')}</div>
                                                        </div>
                                                        <div className="text-nowrap">
                                                            {t.permalink_url && <a href={t.permalink_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-light me-1" title="Open on Facebook"><FiExternalLink /></a>}
                                                            {t.status === 'failed' && <button type="button" className="btn btn-sm btn-primary" onClick={() => retry(t)}><FiRotateCw className="me-1" />Retry</button>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </td></tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default ScheduledPostsPage
