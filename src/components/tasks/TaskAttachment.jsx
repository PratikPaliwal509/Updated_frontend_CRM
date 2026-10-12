import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '@/utils/authSession'

const size = (b) => (b == null ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

/**
 * Task attachments. Files go straight to private storage with a short-lived signature from the
 * API (no open upload preset); opening a file asks the API for a 5-minute download link.
 */
const TaskAttachment = ({ taskId, canUpload = true, canManage = false, currentUserId }) => {
    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [attachments, setAttachments] = useState([])
    const input = useRef(null)

    useEffect(() => {
        if (!taskId) return
        api(`/api/taskAttachments/${taskId}/attachments`).then((d) => setAttachments(d || [])).catch(() => setAttachments([]))
    }, [taskId])

    const upload = async () => {
        if (!file) return toast.warning('Choose a file first')
        setLoading(true)
        try {
            const sig = await api(`/api/taskAttachments/${taskId}/attachments/upload-signature`, { method: 'POST' })
            const ext = (file.name.split('.').pop() || '').toLowerCase()
            if (file.size > sig.max_bytes) throw new Error('Files can be at most 25 MB')
            if (!sig.allowed_formats.includes(ext)) throw new Error(`Files of type .${ext} are not allowed`)
            const form = new FormData()
            Object.entries(sig.params).forEach(([k, v]) => form.append(k, v))
            form.append('file', file)
            const res = await fetch(sig.upload_url, { method: 'POST', body: form })
            const up = await res.json()
            if (!res.ok) throw new Error(up.error?.message || 'Upload failed')
            const saved = await api(`/api/taskAttachments/${taskId}/attachments`, {
                method: 'POST',
                body: { public_id: up.public_id, resource_type: up.resource_type, bytes: up.bytes, format: up.format || ext, file_original_name: file.name, mime_type: file.type, width: up.width, height: up.height },
            })
            setAttachments((prev) => [saved, ...prev])
            setFile(null)
            if (input.current) input.current.value = ''
            toast.success('File attached')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const open = async (a) => {
        try {
            const link = await api(`/api/taskAttachments/attachments/${a.attachment_id}/download`)
            window.open(link.url, '_blank', 'noopener')
        } catch (err) { toast.error(err.message) }
    }

    const remove = async (a) => {
        if (!window.confirm(`Delete "${a.file_original_name}"?`)) return
        try {
            await api(`/api/taskAttachments/attachments/${a.attachment_id}`, { method: 'DELETE' })
            setAttachments((prev) => prev.filter((x) => x.attachment_id !== a.attachment_id))
            toast.success('Attachment deleted')
        } catch (err) { toast.error(err.message) }
    }

    return (
        <div className="card p-3">
            <h6 className="mb-2">Attachments</h6>
            {canUpload && (
                <div className="d-flex gap-2 mb-3">
                    <input ref={input} type="file" className="form-control" onChange={(e) => setFile(e.target.files[0] || null)} aria-label="Choose a file" />
                    <button className="btn btn-primary text-nowrap" onClick={upload} disabled={loading || !file}>{loading ? 'Uploading...' : 'Upload'}</button>
                </div>
            )}
            {canUpload && <p className="fs-11 text-muted mt-n2 mb-3">Up to 25 MB. Images, PDF, Office documents, CSV, ZIP, audio / video and design files. Files are private to people who can see this task.</p>}
            {attachments.length === 0 ? <p className="text-muted fs-12 mb-0">No attachments yet.</p> : (
                <ul className="list-group">
                    {attachments.map((a) => (
                        <li key={a.attachment_id} className="list-group-item d-flex justify-content-between align-items-center">
                            <span>
                                <span className="fw-semibold">{a.file_original_name}</span>
                                <span className="fs-11 text-muted ms-2">{size(a.file_size)}{a.uploadedBy ? ` · ${a.uploadedBy.full_name}` : ''}</span>
                            </span>
                            <div className="d-flex flex-row">
                                <button className="btn btn-sm m-1 btn-outline-primary" onClick={() => open(a)}>Open</button>
                                {(canManage || a.uploaded_by === currentUserId) && (
                                    <button className="btn btn-sm m-1 btn-outline-danger" onClick={() => remove(a)}>Delete</button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default TaskAttachment
