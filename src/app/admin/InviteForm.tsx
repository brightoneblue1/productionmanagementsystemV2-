'use client'

import { useRef, useState, useTransition } from 'react'
import { inviteUser } from './actions'
import { UserPlus, X, Copy, Check } from 'lucide-react'

const ROLES = ['operator', 'tank_filler', 'supervisor', 'kapa', 'admin']

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function InviteForm() {
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [password] = useState(generatePassword)
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(formData: FormData) {
    formData.set('password', password)
    startTransition(async () => {
      const result = await inviteUser(formData)
      if ('error' in result && result.error) {
        setError(result.error)
      } else {
        setCreated({
          email: formData.get('email') as string,
          password,
        })
      }
    })
  }

  function copyCredentials() {
    if (!created) return
    navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <UserPlus size={15} /> Add User
      </button>
    )
  }

  // Success state
  if (created) {
    return (
      <div className="bg-gray-900 border border-emerald-500/30 rounded-xl p-5 max-w-md">
        <h3 className="font-semibold text-sm text-emerald-400 mb-3">User Created</h3>
        <p className="text-xs text-gray-400 mb-3">Share these credentials with the user:</p>
        <div className="bg-gray-800 rounded-lg p-3 font-mono text-sm space-y-1 mb-3">
          <p className="text-gray-300">Email: <span className="text-white">{created.email}</span></p>
          <p className="text-gray-300">Password: <span className="text-white">{created.password}</span></p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyCredentials}
            className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={() => { setCreated(null); setOpen(false) }}
            className="text-xs text-gray-400 hover:text-white px-3 py-1.5"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Add New User</h3>
        <button onClick={() => { setOpen(false); setError('') }} className="text-gray-500 hover:text-white">
          <X size={15} />
        </button>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Full Name</label>
          <input
            name="full_name" required
            placeholder="John Smith"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Email</label>
          <input
            name="email" type="email" required
            placeholder="user@example.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Role</label>
          <select
            name="role" defaultValue="operator"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <p className="text-xs text-gray-500">
          A temporary password will be generated automatically. Share it with the user after creation.
        </p>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          type="submit" disabled={pending}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          {pending ? 'Creating…' : 'Create User'}
        </button>
      </form>
    </div>
  )
}
