import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { API_BASE_URL } from '../../config/api'
import { AD_ACCOUNT_KEY } from '../../config/httpAuth'

/**
 * Meta Ads helpers for the ads screens. The ad account header (X-Meta-Ad-Account) and the auth
 * header are added by config/httpAuth.js; money from Meta is in the currency's minor unit.
 */
const NO_MINOR = ['CLP', 'COP', 'CRC', 'HUF', 'ISK', 'IDR', 'JPY', 'KRW', 'PYG', 'TWD', 'VND']
export const currencyOffset = (cur) => (NO_MINOR.includes(String(cur || '').toUpperCase()) ? 1 : 100)
/** Meta minor units -> major number (null when empty). */
export const toMajor = (minor, cur) => (minor === undefined || minor === null || minor === '' ? null : Number(minor) / currencyOffset(cur))
export const formatMoney = (major, cur) => {
    if (major === null || major === undefined || Number.isNaN(Number(major))) return '-'
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || 'USD', maximumFractionDigits: currencyOffset(cur) === 1 ? 0 : 2 }).format(Number(major))
    } catch {
        return `${cur || ''} ${Number(major).toFixed(2)}`
    }
}
export const formatMinor = (minor, cur) => formatMoney(toMajor(minor, cur), cur)
export const fmtNum = (v, d = 0) => (v === null || v === undefined ? '-' : Number(v).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 }))
export const fmtPct = (v, d = 2) => (v === null || v === undefined ? '-' : `${Number(v).toFixed(d)}%`)

/** Full JSON answer (keeps code / paging / extra fields); throws with .code on errors. */
export const adsApi = async (path, { method = 'GET', body } = {}) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    let json = {}
    try { json = await res.json() } catch { json = {} }
    if (!res.ok || json.success === false) {
        const err = new Error(json.message || `Request failed (${res.status})`)
        err.code = json.code
        err.status = res.status
        throw err
    }
    return json
}

/** Toast for a write: "sent for approval" (202) or the success message. Returns true when applied now. */
export const reportWrite = (json, okMessage) => {
    if (json && json.code === 'APPROVAL_REQUIRED') {
        toast.info(json.message || 'Sent for approval')
        return false
    }
    toast.success(okMessage || json?.message || 'Saved')
    return true
}

/** Currency (and name) of the ad account the user works on. */
export const useAdCurrency = () => {
    const [account, setAccount] = useState(null)
    useEffect(() => {
        let saved = null
        try { saved = Number(localStorage.getItem(AD_ACCOUNT_KEY)) || null } catch { saved = null }
        adsApi('/api/meta/ad-accounts')
            .then((r) => {
                const list = r.data || []
                setAccount(list.find((a) => a.meta_ad_account_id === saved) || list[0] || null)
            })
            .catch(() => setAccount(null))
    }, [])
    return { currency: account?.currency || null, account }
}

/**
 * Paged Meta Ads list (F-086): first page on mount, "Load more" with Meta's cursor.
 * Rows are written with setRows (the screens keep them in their parent for filters / exports).
 * An answer for an ad account that is no longer selected is ignored.
 */
export const usePagedList = ({ path, map, setRows, enabled = true, limit = 50 }) => {
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [after, setAfter] = useState(null)
    const [hasMore, setHasMore] = useState(false)
    const account = () => { try { return localStorage.getItem(AD_ACCOUNT_KEY) } catch { return null } }

    const fetchPage = async (cursor) => {
        const startAccount = account()
        const sep = path.includes('?') ? '&' : '?'
        const json = await adsApi(`${path}${sep}limit=${limit}${cursor ? `&after=${encodeURIComponent(cursor)}` : ''}`)
        if (account() !== startAccount) return null
        const body = json.data && !Array.isArray(json.data) ? json.data : { data: json.data || [], paging: json.paging }
        const paging = body.paging || json.paging || {}
        setAfter(paging.after || null)
        setHasMore(!!paging.has_more)
        return (body.data || []).map(map)
    }

    useEffect(() => {
        if (!enabled) { setLoading(false); return undefined }
        let live = true
        setLoading(true)
        fetchPage(null)
            .then((rows) => { if (live && rows) setRows(rows) })
            .catch((e) => { if (live) { toast.error(e.message); setRows([]) } })
            .finally(() => { if (live) setLoading(false) })
        return () => { live = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, enabled])

    const loadMore = async () => {
        if (!after) return
        setLoadingMore(true)
        try {
            const rows = await fetchPage(after)
            if (rows) setRows((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))])
        } catch (e) {
            toast.error(e.message)
        } finally {
            setLoadingMore(false)
        }
    }
    return { loading, loadingMore, hasMore, loadMore }
}

/** PATCH .../:id/status -> true when applied now (false when sent for approval or failed). */
export const changeStatus = async (path, status) => {
    try {
        const json = await adsApi(path, { method: 'PATCH', body: { status } })
        return reportWrite(json, `Status changed to ${status === 'ACTIVE' ? 'active' : 'paused'}`)
    } catch (e) {
        toast.error(e.message || 'Failed to update status')
        return false
    }
}
