import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '@/utils/authSession'
import { Empty, Loading, fmtDateTime } from './common'

const size = (b) => (b == null ? '-' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

/**
 * F-025: client documents. Files go straight from the browser to private Cloudinary storage
 * using a signature from our API; downloads use short-lived signed links.
 */
const ClientDocumentsTab = ({ clientId }) => {
    const [rows, setRows] = useState(null)
    const [folder, setFolder] = useState('')
    const [share, setShare] = useState(false)
    const [busy, setBusy] = useState(false)
    const [versionOf, setVersionOf] = useState(null)
    const [versions, setVersions] = useState(null)
    const fileRef = useRef(null)
    const load = () => api(`/api/clients/${clientId}/documents`).then(setRows).catch((e) => toast.error(e.message))
    useEffect(() => { load() }, [clientId])

    const upload = async (file, previous) => {
        if (!file) return
        setBusy(true)
        try {
            const sig = await api(`/api/clients/${clientId}/documents/upload-signature`, { method: 'POST' })
            if (file.size > sig.max_bytes) throw new Error('File is larger than 25 MB')
            const fd = new FormData()
            fd.append('file', file)
            Object.entries(sig.params).forEach(([k, v]) => fd.append(k, v))
            const res = await fetch(sig.upload_url, { method: 'POST', body: fd })
            const up = await res.json().catch(() => ({}))
            if (!res.ok || !up.public_id) throw new Error(up?.error?.message || 'Upload failed')
            await api(`/api/clients/${clientId}/documents`, {
                method: 'POST',
                body: {
                    public_id: up.public_id, resource_type: up.resource_type, format: up.format, bytes: up.bytes,
                    name: previous ? undefined : file.name, mime_type: file.type, folder: previous ? undefined : folder || null,
                    shared_with_portal: share, previous_document_id: previous ? previous.document_id : undefined,
                },
            })
            toast.success(previous ? 'New version uploaded' : 'Document uploaded')
            setVersionOf(null)
            await load()
        } catch (e) {
            toast.error(e.message)
        } finally {
            setBusy(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    const download = async (d) => {
        try { const r = await api(`/api/client-documents/${d.document_id}/download`); window.open(r.url, '_blank', 'noopener') } catch (e) { toast.error(e.message) }
    }
    const toggleShare = async (d) => { try { await api(`/api/client-documents/${d.document_id}`, { method: 'PATCH', body: { shared_with_portal: !d.shared_with_portal } }); await load() } catch (e) { toast.error(e.message) } }
    const remove = async (d) => {
        if (!window.confirm(`Delete "${d.name}"? It disappears from the client and the portal.`)) return
        try { await api(`/api/client-documents/${d.document_id}`, { method: 'DELETE' }); await load() } catch (e) { toast.error(e.message) }
    }
    const showVersions = async (d) => { try { setVersions({ doc: d, rows: await api(`/api/client-documents/${d.document_id}/versions`) }) } catch (e) { toast.error(e.message) } }

    const folders = [...new Set((rows || []).map((d) => d.folder).filter(Boolean))]
    return (
        <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Documents</h5></div>
            <div className="card-body">
                <div className="row g-2 align-items-end mb-4">
                    <div className="col-md-3"><label className="form-label">Folder (optional)</label>
                        <input className="form-control" list="doc-folders" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="e.g. Contracts" />
                        <datalist id="doc-folders">{folders.map((f) => <option key={f} value={f} />)}</datalist>
                    </div>
                    <div className="col-md-3"><label className="d-flex align-items-center gap-1 mb-2"><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} /> Share with client portal</label></div>
                    <div className="col-md-6">
                        <input ref={fileRef} type="file" className="form-control" disabled={busy} onChange={(e) => upload(e.target.files[0], versionOf)} />
                        <div className="fs-11 text-muted mt-1">{versionOf ? <>Uploading a new version of <b>{versionOf.name}</b> · <a href="#" onClick={(e) => { e.preventDefault(); setVersionOf(null) }}>cancel</a></> : 'Max 25 MB. Files are stored privately.'}</div>
                    </div>
                </div>
                {busy && <div className="text-muted mb-2">Uploading...</div>}
                {rows === null ? <Loading /> : rows.length === 0 ? <Empty>No documents yet.</Empty> : (
                    <div className="table-responsive"><table className="table mb-0">
                        <thead><tr><th>Name</th><th>Folder</th><th>Version</th><th>Size</th><th>Uploaded</th><th>Portal</th><th /></tr></thead>
                        <tbody>{rows.map((d) => (
                            <tr key={d.document_id}>
                                <td><a href="#" onClick={(e) => { e.preventDefault(); download(d) }}>{d.name}</a></td>
                                <td>{d.folder || '-'}</td>
                                <td>{d.version > 1 ? <a href="#" onClick={(e) => { e.preventDefault(); showVersions(d) }}>v{d.version}</a> : 'v1'}</td>
                                <td>{size(d.size_bytes)}</td>
                                <td className="fs-12">{d.uploader?.full_name || '-'}<br />{fmtDateTime(d.created_at)}</td>
                                <td><button className={`btn btn-sm ${d.shared_with_portal ? 'btn-soft-success' : 'btn-light'}`} onClick={() => toggleShare(d)}>{d.shared_with_portal ? 'Shared' : 'Private'}</button></td>
                                <td className="text-end text-nowrap">
                                    <button className="btn btn-sm btn-light me-1" onClick={() => { setVersionOf(d); fileRef.current?.click() }}>New version</button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => remove(d)}>Delete</button>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table></div>
                )}
                {versions && (
                    <div className="border rounded p-3 mt-3">
                        <div className="d-flex justify-content-between mb-2"><b>Versions of {versions.doc.name}</b><button className="btn btn-sm btn-light" onClick={() => setVersions(null)}>Close</button></div>
                        {versions.rows.map((v) => <div key={v.document_id} className="fs-12 mb-1"><a href="#" onClick={(e) => { e.preventDefault(); download(v) }}>v{v.version}</a> · {v.uploader?.full_name || '-'} · {fmtDateTime(v.created_at)} · {size(v.size_bytes)}</div>)}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ClientDocumentsTab
