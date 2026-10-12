import { API_BASE_URL } from '../config/api';
export const getUserRole = async () => {
  try {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || '{}')

    if (!token || !user?.role_id) {
      return null
    }

    const res = await fetch(
      `${API_BASE_URL}/api/roles/${user.role_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!res.ok) return null

    const result = await res.json()
    return result?.data || null // ✅ ROLE OBJECT
  } catch (error) {
    console.error('getUserRole error:', error)
    return null
  }
}
