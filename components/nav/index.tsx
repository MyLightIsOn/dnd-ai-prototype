// Server component — no "use client" needed
import Link from 'next/link'

export function Nav() {
  const showHistory = process.env.NEXT_PUBLIC_FEATURE_HISTORY === 'true'
  const showTemplates = process.env.NEXT_PUBLIC_FEATURE_TEMPLATES === 'true'

  return (
    <nav className="flex items-center gap-6 px-4 h-10 border-b border-white/10 bg-black/20 text-sm">
      <Link
        href="/"
        className="font-semibold text-white tracking-tight hover:text-white/80 transition-colors"
      >
        inference-sandbox
      </Link>
      <div className="flex items-center gap-4 text-white/60">
        <Link href="/" className="hover:text-white transition-colors">
          Editor
        </Link>
        {showHistory && (
          <Link href="/history" className="hover:text-white transition-colors">
            History
          </Link>
        )}
        {showTemplates && (
          <Link href="/templates" className="hover:text-white transition-colors">
            Templates
          </Link>
        )}
      </div>
    </nav>
  )
}
