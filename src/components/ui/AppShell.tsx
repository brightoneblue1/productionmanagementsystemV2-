import NavLinks from './NavLinks'
import type { Profile } from '@/types'

export default function AppShell({
  profile,
  children,
}: {
  profile: Profile
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center gap-4 sticky top-0 z-10 bg-gray-950/95 backdrop-blur">
        <span className="font-bold text-base tracking-tight shrink-0 text-white mr-2">
          Worth Ops
        </span>

        <div className="flex-1 overflow-x-auto">
          <NavLinks role={profile.role} />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-white leading-tight">{profile.full_name}</p>
            <p className="text-xs text-gray-500 leading-tight capitalize">{profile.role.replace('_', ' ')}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-2.5 py-1 rounded-lg transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Page content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
