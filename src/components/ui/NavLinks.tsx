'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Waves, Briefcase, AlertTriangle, FlaskConical, Users, LayoutDashboard } from 'lucide-react'

const ALL_NAV = [
  { href: '/dashboard', label: 'Home',           icon: LayoutDashboard, roles: ['admin','supervisor','operator','tank_filler','kapa'] },
  { href: '/tanks',     label: 'Tank Farm',      icon: Waves,           roles: ['admin','supervisor','operator','tank_filler','kapa'] },
  { href: '/jobs',      label: 'Job Board',      icon: Briefcase,       roles: ['admin','supervisor','operator'] },
  { href: '/problems',  label: 'Problems',       icon: AlertTriangle,   roles: ['admin','supervisor','operator','tank_filler'] },
  { href: '/reports',   label: 'Lab Reports',    icon: FlaskConical,    roles: ['admin','supervisor','operator','kapa'] },
  { href: '/admin',     label: 'Users',          icon: Users,           roles: ['admin'] },
]

export default function NavLinks({ role }: { role: string }) {
  const pathname = usePathname()
  const items = ALL_NAV.filter(n => n.roles.includes(role))

  return (
    <nav className="flex items-center gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              active
                ? 'bg-gray-800 text-white font-medium'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
