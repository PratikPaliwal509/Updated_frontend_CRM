import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API_BASE_URL } from '../../config/api'

/**
 * Public page linked from Meta's data deletion callback: shows the status of a request
 * by its confirmation code (no login - the person asked through Facebook).
 */
const DataDeletionStatusPage = () => {
    const [params] = useSearchParams()
    const code = params.get('code') || ''
    const [state, setState] = useState({ loading: true })

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/webhooks/facebook/data-deletion/${encodeURIComponent(code)}`)
            .then((r) => r.json())
            .then((j) => setState(j.success ? { data: j.data } : { error: j.message || 'Unknown confirmation code' }))
            .catch(() => setState({ error: 'The status could not be loaded. Please try again later.' }))
    }, [code])

    return (
        <main className="d-flex align-items-center justify-content-center min-vh-100 p-3">
            <div className="card" style={{ maxWidth: 560 }}>
                <div className="card-body">
                    <h4 className="mb-3">Facebook data deletion request</h4>
                    <p className="text-muted">Confirmation code: <code>{code || '-'}</code></p>
                    {state.loading && <p>Loading...</p>}
                    {state.error && <p className="text-danger">{state.error}</p>}
                    {state.data && (
                        <>
                            <p className="mb-1"><strong>Status:</strong> {state.data.status === 'completed' ? 'Completed' : state.data.status}</p>
                            <p className="mb-1"><strong>Received:</strong> {new Date(state.data.created_at).toLocaleString()}</p>
                            {state.data.completed_at && <p className="mb-3"><strong>Completed:</strong> {new Date(state.data.completed_at).toLocaleString()}</p>}
                            <p className="fs-13 text-muted mb-0">
                                The Facebook access tokens and connection records linked to your Facebook account have been deleted from this service.
                                Business records that workspaces keep about their own customers (for example leads they received) are controlled by those
                                businesses; contact them directly to have those removed.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </main>
    )
}

export default DataDeletionStatusPage
