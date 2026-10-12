import React from 'react'
import { Link } from 'react-router-dom'
import { FiFacebook, FiAlertTriangle, FiSettings } from 'react-icons/fi'

/** Select the Facebook Page to work on (pages from usePages()). */
export const PagePicker = ({ pages, selected, onChange, disabled }) => {
    const page = pages.find((p) => p.meta_page_id === selected)
    if (!pages.length) return null
    return (
        <div className="d-flex align-items-center gap-2">
            <FiFacebook className="text-primary" />
            <select className="form-select form-select-sm" style={{ minWidth: 220 }} value={selected || ''} disabled={disabled} aria-label="Facebook Page"
                onChange={(e) => onChange(e.target.value)} data-testid="page-picker">
                {pages.map((p) => (
                    <option key={p.meta_page_id} value={p.meta_page_id}>
                        {p.name}{p.client ? ` - ${p.client.company_name}` : ''}{p.status !== 'active' ? ' (reconnect needed)' : ''}
                    </option>
                ))}
            </select>
            {page && page.status !== 'active' && (
                <Link to="/settings/integrations" className="badge bg-soft-danger text-danger text-decoration-none" title={page.status_reason || ''}>
                    <FiAlertTriangle className="me-1" />Reconnect
                </Link>
            )}
        </div>
    )
}

/** Shown when the workspace has no Facebook Page connected yet (or the request failed). */
export const ConnectHint = ({ error }) => (
    <div className="col-12">
        <div className="card">
            <div className="card-body text-center py-5">
                <FiFacebook size={44} className="text-primary mb-3" />
                {error ? (
                    <>
                        <h5 className="mb-2">Facebook is not available</h5>
                        <p className="text-muted mb-3">{error.message}</p>
                    </>
                ) : (
                    <>
                        <h5 className="mb-2">No Facebook Page connected</h5>
                        <p className="text-muted mb-3">Connect your Facebook account and choose the Pages this workspace manages.</p>
                    </>
                )}
                <Link to="/settings/integrations" className="btn btn-primary"><FiSettings className="me-2" />Open Integrations</Link>
            </div>
        </div>
    </div>
)

/** Readable message for an API error (reconnect / permission / rate limit). */
export const metaErrorText = (e) => {
    if (!e) return ''
    if (e.code === 'META_RECONNECT_REQUIRED') return `${e.message}`
    if (e.code === 'PERMISSION_DENIED') return 'Your role does not allow this. Ask an administrator for the "Social" permission.'
    return e.message || 'Something went wrong'
}

export default PagePicker
