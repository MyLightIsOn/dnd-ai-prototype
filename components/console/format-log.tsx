'use client'

import React from 'react'

export function formatLog(log: string) {
  if (log.startsWith('🤖')) return <div className="text-blue-600">{log}</div>;
  if (log.startsWith('📄')) return <div className="text-green-600">{log}</div>;
  if (log.startsWith('💰')) return <div className="text-yellow-600">{log}</div>;
  if (log.startsWith('❌')) return <div className="text-red-600">{log}</div>;
  if (log.startsWith('✅')) return <div className="text-green-700">{log}</div>;
  if (log.startsWith('⚠️')) return <div className="text-orange-600">{log}</div>;
  return <div>{log}</div>;
}
