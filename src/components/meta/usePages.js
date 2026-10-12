import { useCallback, useEffect, useState } from 'react'
import { api } from '@/utils/authSession'

const KEY = 'tl_meta_page'
const readSaved = () => { try { return Number(localStorage.getItem(KEY)) || null } catch { return null } }
const save = (id) => { try { localStorage.setItem(KEY, String(id)) } catch { /* private mode */ } }

/**
 * Connected Facebook Pages of the workspace (GET /api/meta/pages) and the one the user is working on
 * (remembered in this browser). `notConnected` = no usable Page yet -> show the connect hint.
 */
const usePages = () => {
    const [pages, setPages] = useState([])
    const [selected, setSelectedState] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const list = await api('/api/meta/pages')
            setPages(list)
            const saved = readSaved()
            const usable = list.filter((p) => p.status === 'active')
            const pick = list.find((p) => p.meta_page_id === saved) || usable[0] || list[0] || null
            setSelectedState(pick ? pick.meta_page_id : null)
        } catch (e) {
            setError(e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const setSelected = (id) => { setSelectedState(Number(id)); save(Number(id)) }
    const page = pages.find((p) => p.meta_page_id === selected) || null
    return { pages, page, selected, setSelected, loading, error, reload: load, notConnected: !loading && !error && pages.length === 0 }
}

export default usePages
