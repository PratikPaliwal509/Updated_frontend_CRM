import React, { useEffect, useState } from 'react'
import { FiEdit } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { api, cachedMe } from '@/utils/authSession'

const UsersViewHeader = ({ user }) => {
    const navigate = useNavigate()
    const [roles, setRoles] = useState([])
    const [roleId, setRoleId] = useState(user.role_id || user.role?.role_id || '')
    const [saving, setSaving] = useState(false)
    const me = cachedMe()
    const isSelf = me?.user?.user_id === user.user_id

    useEffect(() => {
        if (isSelf) return
        api('/api/roles').then((r) => setRoles((r || []).filter((x) => x.role_name !== 'Client'))).catch(() => setRoles([]))
    }, [isSelf])

    // Role changes go through PATCH /api/users/:id/role, which blocks self-change,
    // protects the workspace owner and refuses roles stronger than the caller's.
    const changeRole = async (e) => {
        const next = e.target.value
        const prev = roleId
        setRoleId(next)
        setSaving(true)
        try {
            await api(`/api/users/${user.user_id}/role`, { method: 'PATCH', body: { role_id: Number(next) } })
            toast.success('Role updated')
        } catch (err) {
            setRoleId(prev)
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
            <h4 className="mb-0">{user.full_name || user.name}</h4>

            <div className="d-flex align-items-center gap-2">
                {!isSelf && roles.length > 0 && (
                    <select className="form-select form-select-sm" style={{ minWidth: 160 }} value={roleId} onChange={changeRole} disabled={saving} aria-label="Role">
                        {roles.map((r) => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                    </select>
                )}
                <button
                    className="btn btn-outline-primary"
                    onClick={() => navigate(`/user/edit/${user.user_id || user.id}`)}
                >
                    <FiEdit className="me-1" />
                    Edit User
                </button>
            </div>
        </div>
    )
}

export default UsersViewHeader
