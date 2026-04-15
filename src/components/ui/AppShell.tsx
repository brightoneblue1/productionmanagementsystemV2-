'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import NavLinks from './NavLinks'
import AlertNotifier from './AlertNotifier'
import type { Profile } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  admin:       'Administrator',
  supervisor:  'Supervisor',
  operator:    'Operator',
  tank_filler: 'Tank Filler',
  kapa:        'Kapa (Read-only)',
}

function Sidebar({ profile, onClose }: { profile: Profile; onClose?: () => void }) {
  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <p className="font-bold text-white text-sm leading-tight">Worth Oil Processors</p>
          <p className="text-xs text-gray-500 mt-0.5">Operations Management</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-white lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Plant context */}
      <div className="mx-3 mt-3 mb-1 bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2.5">
        <p className="text-xs text-gray-500 leading-tight">Active Plant</p>
        <p className="text-sm font-medium text-white mt-0.5">All Plants</p>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3">
        <NavLinks role={profile.role} onNavigate={onClose} />
      </div>

      {/* User */}
      <div className="border-t border-gray-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-orange-400">
            {profile.full_name?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{profile.full_name}</p>
          <p className="text-xs text-gray-500 truncate">{ROLE_LABELS[profile.role] ?? profile.role}</p>
        </div>
        <AlertNotifier />
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-xs text-gray-500 hover:text-white transition-colors" title="Sign out">
            Out
          </button>
        </form>
      </div>
    </aside>
  )
}

export default function AppShell({
  profile,
  children,
}: {
  profile: Profile
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar profile={profile} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-30 flex lg:hidden">
            <Sidebar profile={profile} onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold text-sm text-white flex-1">Worth Oil Processors</span>
          <AlertNotifier />
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  )
}
