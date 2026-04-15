'use client'

import { useEffect } from 'react'

export default function PrintButton() {
  useEffect(() => {
    if (window.location.search.includes('print=1')) window.print()
  }, [])

  return (
    <button
      onClick={() => window.print()}
      style={{ padding: '8px 16px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
    >
      Print / Save PDF
    </button>
  )
}
