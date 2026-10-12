import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '@/utils/authSession'
import { Empty, Loading, fmtDateTime } from './common'

/** F-026: everything that happened around this client, newest first. */
const ClientTimelineTab = ({ clientId }) => {
    const [rows, setRows] = useState(null)
    useEffect(() => { api(`/api/clients/${clientId}/timeline`).then(setRows).catch((e) => toast.error(e.message)) }, [clientId])
    return (
        <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Activity timeline</h5></div>
            <div className="card-body">
                {rows === null ? <Loading /> : rows.length === 0 ? <Empty>No activity yet.</Empty> : (
                    <ul className="list-unstyled mb-0">
                        {rows.map((r) => (
                            <li key={r.log_id} className="d-flex gap-3 pb-3 mb-3 border-bottom">
                                <div className="fs-11 text-muted text-nowrap" style={{ minWidth: 140 }}>{fmtDateTime(r.created_at)}</div>
                                <div>
                                    <div className="fw-semibold text-capitalize">{String(r.action).toLowerCase()}</div>
                                    <div className="fs-12 text-muted">{r.entity_name}{r.user_name ? ` · by ${r.user_name}` : ''}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

export default ClientTimelineTab
