'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, BellOff, X, ShieldAlert, AlertTriangle } from 'lucide-react'

interface Toast {
  id: string
  title: string
  message: string
  severity: 'critical' | 'high' | 'medium'
  source: 'maintenance' | 'problem'
}

const SEVERITY_META = {
  critical: { bar: 'bg-red-500',    icon: <ShieldAlert size={14} className="text-red-400 shrink-0" />, label: 'Critical' },
  high:     { bar: 'bg-orange-500', icon: <AlertTriangle size={14} className="text-orange-400 shrink-0" />, label: 'High' },
  medium:   { bar: 'bg-amber-500',  icon: <AlertTriangle size={14} className="text-amber-400 shrink-0" />, label: 'Medium' },
}

// Generate a chime using Web Audio API (no external files)
function playChime(ctx: AudioContext, urgent: boolean) {
  const tones = urgent
    ? [
        { freq: 880,  start: 0,    dur: 0.13 },
        { freq: 1108, start: 0.18, dur: 0.13 },
        { freq: 880,  start: 0.36, dur: 0.18 },
      ]
    : [
        { freq: 660, start: 0,    dur: 0.18 },
        { freq: 880, start: 0.24, dur: 0.22 },
      ]

  for (const { freq, start, dur } of tones) {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.value = freq

    const t = ctx.currentTime + start
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.linearRampToValueAtTime(0.32, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur)

    osc.start(t)
    osc.stop(t + dur + 0.06)
  }
}

export default function AlertNotifier() {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [muted, setMuted]     = useState(false)
  const [toasts, setToasts]   = useState<Toast[]>([])
  const [count, setCount]     = useState(0)   // active alert badge
  const mutedRef = useRef(muted)
  mutedRef.current = muted

  // Ensure AudioContext exists (requires prior user gesture)
  const ensureCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }, [])

  // Initialise AudioContext on first user interaction so autoplay policy is satisfied
  useEffect(() => {
    const init = () => { ensureCtx() }
    window.addEventListener('click', init, { once: true })
    window.addEventListener('keydown', init, { once: true })
    return () => {
      window.removeEventListener('click', init)
      window.removeEventListener('keydown', init)
    }
  }, [ensureCtx])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-2), { ...toast, id }])   // keep at most 3
    setCount(c => c + 1)

    if (!mutedRef.current && audioCtxRef.current) {
      playChime(audioCtxRef.current, toast.severity === 'critical')
    }

    // Auto-dismiss after 6 s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 6000)
  }, [])

  // Supabase Realtime subscriptions
  useEffect(() => {
    const supabase = createClient()

    const maintenanceSub = supabase
      .channel('maintenance_alerts_new')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'maintenance_alerts' },
        (payload) => {
          const row = payload.new as { title: string; message?: string; severity: string }
          const sev = (row.severity === 'critical' || row.severity === 'high' ? row.severity : 'medium') as Toast['severity']
          addToast({
            title:    row.title,
            message:  row.message ?? 'Maintenance alert raised.',
            severity: sev,
            source:   'maintenance',
          })
        }
      )
      .subscribe()

    const problemSub = supabase
      .channel('problems_critical_new')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'problems' },
        (payload) => {
          const row = payload.new as { title: string; severity: string }
          if (row.severity !== 'critical' && row.severity !== 'high') return
          addToast({
            title:    row.title,
            message:  `New ${row.severity} problem reported.`,
            severity: row.severity as Toast['severity'],
            source:   'problem',
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(maintenanceSub)
      supabase.removeChannel(problemSub)
    }
  }, [addToast])

  function dismiss(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  function toggleMute() {
    setMuted(m => {
      // Play a soft confirmation chime when unmuting so user can verify audio works
      if (m && audioCtxRef.current) {
        playChime(audioCtxRef.current, false)
      }
      return !m
    })
    setCount(0)
  }

  return (
    <>
      {/* Mute toggle + badge — rendered inline wherever this component is placed */}
      <button
        onClick={toggleMute}
        title={muted ? 'Unmute alerts' : 'Mute alerts'}
        className="relative text-gray-500 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-800"
      >
        {muted
          ? <BellOff size={15} />
          : <Bell size={15} className={count > 0 ? 'text-orange-400 animate-pulse' : ''} />
        }
        {!muted && count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Toast stack — fixed top-right */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => {
          const meta = SEVERITY_META[toast.severity]
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl px-4 py-3 w-80 animate-in slide-in-from-right-4 fade-in duration-300"
            >
              {/* Severity bar */}
              <div className={`w-0.5 self-stretch rounded-full shrink-0 ${meta.bar}`} />

              {meta.icon}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white leading-snug">{toast.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{toast.message}</p>
                <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-wide">
                  {meta.label} · {toast.source === 'maintenance' ? 'Maintenance' : 'Problem'}
                </p>
              </div>

              <button onClick={() => dismiss(toast.id)} className="text-gray-600 hover:text-white shrink-0 mt-0.5">
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}
