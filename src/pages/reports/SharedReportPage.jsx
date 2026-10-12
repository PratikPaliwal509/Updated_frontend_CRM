import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_BASE_URL } from '../../config/api'

/**
 * Public page of a shared report link (no login): title, period and the PDF. The token is checked
 * by the API; expired or revoked links show a clear message.
 */
const SharedReportPage = () => {
    const { token } = useParams()
    const [state, setState] = useState({ loading: true })
    const pdfUrl = `${API_BASE_URL}/api/reports/shared/${encodeURIComponent(token)}`

    useEffect(() => {
        fetch(`${pdfUrl}?info=1`, { credentials: 'omit' })
            .then((r) => r.json())
            .then((j) => setState(j.success ? { data: j.data } : { error: j.message || 'This link is not valid or has expired' }))
            .catch(() => setState({ error: 'The report could not be loaded. Please try again later.' }))
    }, [pdfUrl])

    return (
        <main className="min-vh-100 p-3 d-flex flex-column align-items-center" style={{ background: '#f4f6fb' }}>
            <div className="card w-100" style={{ maxWidth: 1000 }}>
                <div className="card-body">
                    {state.loading && <p className="mb-0">Loading...</p>}
                    {state.error && (
                        <>
                            <h4 className="mb-2">Report not available</h4>
                            <p className="text-muted mb-0" data-testid="shared-error">{state.error}. Ask the sender for a new link.</p>
                        </>
                    )}
                    {state.data && (
                        <>
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                                <div>
                                    <h4 className="mb-1" data-testid="shared-title">{state.data.title}</h4>
                                    <div className="fs-13 text-muted">{state.data.period_from} to {state.data.period_to} · link valid until {new Date(state.data.expires_at).toLocaleDateString()}</div>
                                </div>
                                <a className="btn btn-primary" href={`${pdfUrl}?download=1`} data-testid="shared-download">Download PDF</a>
                            </div>
                            <iframe title="Report" src={pdfUrl} style={{ width: '100%', height: '80vh', border: '1px solid #e3e6ef', borderRadius: 6 }} />
                        </>
                    )}
                </div>
            </div>
        </main>
    )
}

export default SharedReportPage
