'use client'

import { useTransition } from 'react'
import { updateUserRole, toggleUserActive } from './actions'

interface Profile {
  id: string
  full_name: string
  role: string
  employee_id: string | null
  is_active: boolean
}

const ROLES = ['operator', 'tank_filler', 'supervisor', 'kapa', 'admin']

const ROLE_COLORS: Record<string, string> = {
  admin:       'text-red-400',
  supervisor:  'text-blue-400',
  operator:    'text-emerald-400',
  tank_filler: 'text-yellow-400',
  kapa:        'text-gray-400',
}

export default function UserRow({ profile, currentUserId }: { profile: Profile; currentUserId: string }) {
  const [pending, startTransition] = useTransition()
  const isSelf = profile.id === currentUserId

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData()
    fd.set('profile_id', profile.id)
    fd.set('role', e.target.value)
    startTransition(() => updateUserRole(fd))
  }

  function handleToggle() {
    const fd = new FormData()
    fd.set('profile_id', profile.id)
    fd.set('is_active', String(profile.is_active))
    startTransition(() => toggleUserActive(fd))
  }

  return (
    <tr className={`border-b border-gray-800 ${!profile.is_active ? 'opacity-50' : ''}`}>
      <td className="py-3 pr-4">
        <p className="text-sm font-medium text-white">{profile.full_name}</p>
        {profile.employee_id && <p className="text-xs text-gray-500">ID: {profile.employee_id}</p>}
      </td>
      <td className="py-3 pr-4">
        {isSelf ? (
          <span className={`text-sm ${ROLE_COLORS[profile.role]}`}>{profile.role}</span>
        ) : (
          <select
            defaultValue={profile.role}
            onChange={handleRoleChange}
            disabled={pending}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {ROLES.map(r => (
              <option key={r} value={r} className={ROLE_COLORS[r]}>{r}</option>
            ))}
          </select>
        )}
      </td>
      <td className="py-3">
        {isSelf ? (
          <span className="text-xs text-gray-500">—</span>
        ) : (
          <button
            onClick={handleToggle}
            disabled={pending}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              profile.is_active
                ? 'border-gray-600 text-gray-400 hover:border-red-500 hover:text-red-400'
                : 'border-emerald-600 text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            {profile.is_active ? 'Deactivate' : 'Activate'}
          </button>
        )}
      </td>
    </tr>
  )
}
