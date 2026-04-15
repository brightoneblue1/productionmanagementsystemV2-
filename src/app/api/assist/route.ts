import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, context } = await req.json()
  if (!message?.trim()) return Response.json({ error: 'No message' }, { status: 400 })

  // Fetch live snapshot for the AI
  const [
    { data: problems },
    { data: tanks },
    { data: shifts },
    { data: reports },
  ] = await Promise.all([
    supabase.from('problems').select('title, severity, status, reported_at').eq('status', 'open').limit(10),
    supabase.from('tanks').select('name, code, current_level_liters, capacity_liters, min_level_percent, max_level_percent').eq('is_active', true).limit(20),
    supabase.from('shifts').select('shift_type, shift_date, start_time, end_time').gte('shift_date', new Date().toISOString().split('T')[0]).limit(5),
    supabase.from('lab_reports').select('report_number, status, sample_taken_at').order('created_at', { ascending: false }).limit(5),
  ])

  const snapshot = JSON.stringify({ openProblems: problems, tanks, upcomingShifts: shifts, recentReports: reports }, null, 2)

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `You are an operations assistant for Worth Oil Processors, a petroleum processing facility.
You have access to live plant data. Be concise and practical. Answer in plain text — no markdown.
Current plant snapshot:
${snapshot}`,
    messages: [{ role: 'user', content: message }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return Response.json({ reply: text })
}
