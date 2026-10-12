import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiBarChart2, FiAlertTriangle, FiSettings } from 'react-icons/fi'
import { api } from '@/utils/authSession'
import { AD_ACCOUNT_KEY } from '../../config/httpAuth'

const readSaved = () => { try { return Number(localStorage.getItem(AD_ACCOUNT_KEY)) || null } catch { return null } }
const save = (id) => { try { if (id) localStorage.setItem(AD_ACCOUNT_KEY, String(id)); else localStorage.removeItem(AD_ACCOUNT_KEY) } catch { /* private mode */ } }

/**
 * The workspace's Meta ad accounts (GET /api/meta/ad-accounts) and the one the user works on.
 * The choice is remembered in this browser and sent as X-Meta-Ad-Account with every ads call
 * (config/httpAuth.js) - only our row id, never a token.
 */
export const useAdAccounts = () => {
    const [accounts, setAccounts] = useState([])
    const [selected, setSelectedState] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const load = useCallback(async ({ quiet = false } = {}) => {
        if (!quiet) setLoading(true)
        setError(null)
        try {
            const list = await api('/api/meta/ad-accounts')
            setAccounts(list)
            const saved = readSaved()
            const pick = list.find((a) => a.meta_ad_account_id === saved) || list.find((a) => a.status === 'active') || list[0] || null
            setSelectedState(pick ? pick.meta_ad_account_id : null)
            save(pick ? pick.meta_ad_account_id : null)
        } catch (e) {
            setError(e)
        } finally {
            setLoading(false)
        }
    }, [])
    // first load shows the loader; a repeated load (React StrictMode, reload) keeps the screen mounted
    const loadedOnce = React.useRef(false)
    useEffect(() => { load({ quiet: loadedOnce.current }); loadedOnce.current = true }, [load])
    const setSelected = (id) => { setSelectedState(Number(id)); save(Number(id)) }
    return { accounts, selected, setSelected, loading, error, reload: load, notConnected: !loading && !error && accounts.length === 0 }
}

export const AdAccountPicker = ({ accounts, selected, onChange, disabled }) => {
    const acc = accounts.find((a) => a.meta_ad_account_id === selected)
    if (!accounts.length) return null
    return (
        <div className="d-flex align-items-center gap-2">
            <FiBarChart2 className="text-primary" />
            <select className="form-select form-select-sm" style={{ minWidth: 220 }} value={selected || ''} disabled={disabled} aria-label="Meta ad account"
                onChange={(e) => onChange(e.target.value)} data-testid="ad-account-picker">
                {accounts.map((a) => (
                    <option key={a.meta_ad_account_id} value={a.meta_ad_account_id}>
                        {a.name}{a.client ? ` - ${a.client.company_name}` : ''}{a.status !== 'active' ? ' (reconnect needed)' : ''}
                    </option>
                ))}
            </select>
            {acc && acc.status !== 'active' && (
                <Link to="/settings/integrations" className="badge bg-soft-danger text-danger text-decoration-none" title={acc.status_reason || ''}>
                    <FiAlertTriangle className="me-1" />Reconnect
                </Link>
            )}
        </div>
    )
}

/** Shown when the workspace has no ad account in use yet. */
export const AdConnectHint = ({ error }) => (
    <div className="col-12">
        <div className="card">
            <div className="card-body text-center py-5">
                <FiBarChart2 size={44} className="text-primary mb-3" />
                <h5 className="mb-2">{error ? 'Meta Ads is not available' : 'No Meta ad account connected'}</h5>
                <p className="text-muted mb-3">{error ? error.message : 'Connect your Facebook account and choose the ad accounts this workspace manages.'}</p>
                <Link to="/settings/integrations" className="btn btn-primary"><FiSettings className="me-2" />Open Integrations</Link>
            </div>
        </div>
    </div>
)

export default AdAccountPicker
