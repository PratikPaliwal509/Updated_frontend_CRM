import React, { useCallback, useEffect, useState } from 'react'
import { FiX, FiEye, FiEyeOff, FiTrash2, FiCornerDownRight, FiSend } from 'react-icons/fi'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import { api } from '@/utils/authSession'
import { metaErrorText } from './PagePicker'

const when = (d) => (d ? new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')

/** One comment with its actions and (lazy) replies. */
const Comment = ({ pageId, c, onChanged, depth = 0 }) => {
    const [replies, setReplies] = useState(null)
    const [replyText, setReplyText] = useState('')
    const [busy, setBusy] = useState(false)
    const [open, setOpen] = useState(false)

    const loadReplies = async () => {
        try { setReplies((await api(`/api/meta/pages/${pageId}/comments/${c.id}/replies`)).data) } catch (e) { toast.error(metaErrorText(e)) }
    }
    const run = async (fn, okMsg) => {
        setBusy(true)
        try { await fn(); if (okMsg) toast.success(okMsg); onChanged() } catch (e) { toast.error(metaErrorText(e)) } finally { setBusy(false) }
    }
    const toggleHidden = () => run(() => api(`/api/meta/pages/${pageId}/comments/${c.id}`, { method: 'PATCH', body: { is_hidden: !c.is_hidden } }), c.is_hidden ? 'Comment visible again' : 'Comment hidden')
    const remove = async () => {
        const ok = await Swal.fire({ title: 'Delete this comment?', text: 'It is removed from Facebook.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete' })
        if (ok.isConfirmed) run(() => api(`/api/meta/pages/${pageId}/comments/${c.id}`, { method: 'DELETE' }), 'Comment deleted')
    }
    const sendReply = async (e) => {
        e.preventDefault()
        if (!replyText.trim()) return
        await run(async () => { await api(`/api/meta/pages/${pageId}/comments/${c.id}/replies`, { method: 'POST', body: { message: replyText } }); setReplyText(''); await loadReplies(); setOpen(true) }, 'Reply posted')
    }

    return (
        <div className={`border rounded p-2 mb-2 ${c.is_hidden ? 'bg-light' : ''}`} style={{ marginLeft: depth * 16 }} data-testid="comment">
            <div className="d-flex justify-content-between align-items-start">
                <div>
                    <strong className="fs-13">{c.from?.name || 'Facebook user'}</strong>
                    {c.from_page && <span className="badge bg-soft-primary text-primary ms-2">Page</span>}
                    {c.is_hidden && <span className="badge bg-soft-warning text-warning ms-2">Hidden</span>}
                    <div className="fs-11 text-muted">{when(c.created_time)}</div>
                </div>
                <div className="d-flex gap-1">
                    {c.can_hide !== false && !c.from_page && (
                        <button type="button" className="btn btn-sm btn-light" disabled={busy} title={c.is_hidden ? 'Show' : 'Hide'} onClick={toggleHidden}>
                            {c.is_hidden ? <FiEye /> : <FiEyeOff />}
                        </button>
                    )}
                    {c.can_remove !== false && (
                        <button type="button" className="btn btn-sm btn-light-danger" disabled={busy} title="Delete" onClick={remove}><FiTrash2 /></button>
                    )}
                </div>
            </div>
            <p className="fs-13 mb-2 mt-1" style={{ whiteSpace: 'pre-line' }}>{c.message}</p>
            {depth === 0 && (
                <>
                    {(c.comment_count > 0 || replies) && (
                        <button type="button" className="btn btn-link btn-sm p-0 mb-2" onClick={async () => { if (!replies) await loadReplies(); setOpen(!open) }}>
                            <FiCornerDownRight className="me-1" />{open ? 'Hide replies' : `Replies (${replies ? replies.length : c.comment_count})`}
                        </button>
                    )}
                    {open && replies && replies.map((r) => <Comment key={r.id} pageId={pageId} c={r} depth={1} onChanged={loadReplies} />)}
                    <form className="d-flex gap-2" onSubmit={sendReply}>
                        <input className="form-control form-control-sm" placeholder="Reply as the Page..." value={replyText} maxLength={8000} onChange={(e) => setReplyText(e.target.value)} aria-label="Reply" />
                        <button type="submit" className="btn btn-sm btn-primary" disabled={busy || !replyText.trim()}><FiSend /></button>
                    </form>
                </>
            )}
        </div>
    )
}

/** Right-hand panel: comments of one post (moderate and answer as the Page). */
const CommentsPanel = ({ pageId, post, onClose }) => {
    const [comments, setComments] = useState([])
    const [next, setNext] = useState(null)
    const [loading, setLoading] = useState(true)
    const [text, setText] = useState('')

    const load = useCallback(async (after) => {
        setLoading(true)
        try {
            const r = await api(`/api/meta/pages/${pageId}/posts/${encodeURIComponent(post.id)}/comments${after ? `?after=${encodeURIComponent(after)}` : ''}`)
            setComments((prev) => (after ? [...prev, ...r.data] : r.data))
            setNext(r.next)
        } catch (e) {
            toast.error(metaErrorText(e))
        } finally {
            setLoading(false)
        }
    }, [pageId, post.id])
    useEffect(() => { load() }, [load])

    const commentAsPage = async (e) => {
        e.preventDefault()
        try {
            await api(`/api/meta/pages/${pageId}/posts/${encodeURIComponent(post.id)}/comments`, { method: 'POST', body: { message: text } })
            setText('')
            toast.success('Comment posted')
            load()
        } catch (err) { toast.error(metaErrorText(err)) }
    }

    return (
        <div className="position-fixed top-0 end-0 h-100 bg-white shadow d-flex flex-column" style={{ width: 'min(480px, 100vw)', zIndex: 1080 }} data-testid="comments-panel">
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                <div>
                    <h6 className="mb-0">Comments</h6>
                    <div className="fs-12 text-muted text-truncate" style={{ maxWidth: 360 }}>{post.message || post.id}</div>
                </div>
                <button type="button" className="btn btn-sm btn-light" onClick={onClose} aria-label="Close"><FiX /></button>
            </div>
            <div className="p-3 overflow-auto flex-grow-1">
                {loading && !comments.length && <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>}
                {!loading && !comments.length && <p className="text-muted text-center py-4">No comments yet.</p>}
                {comments.map((c) => <Comment key={c.id} pageId={pageId} c={c} onChanged={() => load()} />)}
                {next && <button type="button" className="btn btn-light w-100" disabled={loading} onClick={() => load(next)}>Load more</button>}
            </div>
            <form className="p-3 border-top d-flex gap-2" onSubmit={commentAsPage}>
                <input className="form-control" placeholder="Comment as the Page..." value={text} maxLength={8000} onChange={(e) => setText(e.target.value)} aria-label="Comment" />
                <button type="submit" className="btn btn-primary" disabled={!text.trim()}><FiSend /></button>
            </form>
        </div>
    )
}

export default CommentsPanel
