'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Briefcase, AlertTriangle,
  ClipboardList, Users, FileBarChart2, Layers,
  Factory, FlaskConical, ChevronDown, ChevronRight,
  ShieldCheck, Wrench, Gauge, BookOpen, FileText,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Plant { id: string; code: string; name: string }

const TOP_NAV = [
  { href: '/dashboard',      label: 'Monitoring',       icon: LayoutDashboard, roles: ['admin','supervisor','operator','tank_filler','kapa'] },
  { href: '/jobs',           label: 'Shift Management',  icon: Briefcase,       roles: ['admin','supervisor','operator'] },
  { href: '/problems',       label: 'Problems',          icon: AlertTriangle,   roles: ['admin','supervisor','operator','tank_filler'] },
  { href: '/reports',        label: 'Reports',            icon: ClipboardList,   roles: ['admin','supervisor','operator','kapa'] },
  { href: '/procedures',     label: 'Procedures',         icon: BookOpen,        roles: ['admin','supervisor','operator'] },
  { href: '/permits',        label: 'Work Permits',       icon: FileText,        roles: ['admin','supervisor','operator'] },
  { href: '/maintenance',    label: 'Maintenance',        icon: Wrench,          roles: ['admin','supervisor','operator'] },
  { href: '/ops-report',     label: 'Ops Report',        icon: FileBarChart2,   roles: ['admin','supervisor','kapa'] },
  { href: '/admin/facility', label: 'Facility',          icon: Layers,          roles: ['admin','supervisor'] },
  { href: '/admin',          label: 'Personnel',         icon: Users,           roles: ['admin'] },
]

export default function NavLinks({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const activePlant  = searchParams.get('plant')

  const [plants, setPlants]           = useState<Plant[]>([])
  const [expanded, setExpanded]       = useState(true)
  const [reportsOpen, setReportsOpen] = useState(false)

  useEffect(() => {
    createClient()
      .from('plants')
      .select('id, code, name')
      .eq('is_active', true)
      .order('code')
      .then(({ data }) => { if (data) setPlants(data) })
  }, [])

  // auto-expand when a plant filter is active or on /tanks
  useEffect(() => {
    if (pathname.startsWith('/tanks')) setExpanded(true)
    if (pathname.startsWith('/reports')) setReportsOpen(true)
  }, [pathname])

  const items = TOP_NAV.filter(n => n.roles.includes(role))

  const tanksActive = pathname.startsWith('/tanks')

  return (
    <nav className="flex flex-col gap-0.5 px-3">

      {/* Static nav items above Plants */}
      <NavItem href="/dashboard" label="Monitoring" icon={LayoutDashboard}
        active={pathname === '/dashboard'} onClick={onNavigate} />

      {/* ── Plants section ── */}
      <div>
        {/* Header row — clicking toggles expand; also navigates to /tanks (all) */}
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
          tanksActive && !activePlant
            ? 'bg-orange-500 text-white font-medium'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}>
          <Link
            href="/tanks"
            onClick={onNavigate}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <Factory size={18} className={tanksActive && !activePlant ? 'text-white' : 'text-gray-500'} />
            <span>Plants</span>
          </Link>
          <button
            onClick={() => setExpanded(e => !e)}
            className="shrink-0 p-0.5 -mr-1"
            aria-label={expanded ? 'Collapse plants' : 'Expand plants'}
          >
            {expanded
              ? <ChevronDown size={14} className="opacity-60" />
              : <ChevronRight size={14} className="opacity-60" />}
          </button>
        </div>

        {/* Plant sub-items */}
        {expanded && plants.length > 0 && (
          <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-gray-800 pl-3">
            {plants.map(plant => {
              const active = tanksActive && activePlant === plant.code
              return (
                <Link
                  key={plant.code}
                  href={`/tanks?plant=${plant.code}`}
                  onClick={onNavigate}
                  className={`flex flex-col px-2 py-1.5 rounded-md text-xs transition-colors ${
                    active
                      ? 'bg-orange-500/20 text-orange-300 font-medium'
                      : 'text-gray-500 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span className={`font-semibold ${active ? 'text-orange-300' : 'text-gray-400'}`}>
                    {plant.code}
                  </span>
                  <span className="leading-tight mt-0.5">{plant.name}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Remaining nav items */}
      {items
        .filter(n => n.href !== '/dashboard')
        .map(({ href, label, icon: Icon }) => {
          if (href === '/reports') {
            const reportsActive = pathname.startsWith('/reports')
            const REPORT_MODULES = [
              { href: '/reports/production', label: 'Plant Area',  icon: Gauge },
              { href: '/reports/equipment',  label: 'Equipment',   icon: Wrench },
              { href: '/reports/safety',     label: 'Safety',      icon: ShieldCheck },
              { href: '/reports/quality',    label: 'Oil Quality', icon: FlaskConical },
            ]
            return (
              <div key={href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                  reportsActive
                    ? 'bg-orange-500 text-white font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>
                  <Link href="/reports" onClick={onNavigate} className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon size={18} className={reportsActive ? 'text-white' : 'text-gray-500'} />
                    <span>{label}</span>
                  </Link>
                  <button
                    onClick={() => setReportsOpen(o => !o)}
                    className="shrink-0 p-0.5 -mr-1"
                    aria-label={reportsOpen ? 'Collapse reports' : 'Expand reports'}
                  >
                    {reportsOpen
                      ? <ChevronDown size={14} className="opacity-60" />
                      : <ChevronRight size={14} className="opacity-60" />}
                  </button>
                </div>
                {reportsOpen && (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-gray-800 pl-3">
                    {REPORT_MODULES.map(mod => {
                      const modActive = pathname.startsWith(mod.href)
                      return (
                        <Link
                          key={mod.href}
                          href={mod.href}
                          onClick={onNavigate}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                            modActive
                              ? 'bg-orange-500/20 text-orange-300 font-medium'
                              : 'text-gray-500 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          <mod.icon size={13} className={modActive ? 'text-orange-300' : 'text-gray-600'} />
                          <span>{mod.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <NavItem key={href} href={href} label={label} icon={Icon}
              active={active} onClick={onNavigate} />
          )
        })}
    </nav>
  )
}

function NavItem({
  href, label, icon: Icon, active, onClick,
}: {
  href: string; label: string; icon: React.ComponentType<{ size: number; className?: string }>
  active: boolean; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-orange-500 text-white font-medium'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      <Icon size={18} className={active ? 'text-white' : 'text-gray-500'} />
      <span>{label}</span>
    </Link>
  )
}
