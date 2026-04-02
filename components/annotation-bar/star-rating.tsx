"use client"

import { Star } from 'lucide-react'
import { useState } from 'react'

interface StarRatingProps {
  value: number | null   // 1–5 or null
  onChange: (value: number | null) => void
}

export function StarRating({ value, onChange }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null)

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hover ?? value ?? 0) >= star
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            aria-pressed={value === star}
            className="text-zinc-600 hover:text-yellow-400 transition-colors focus:outline-none"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(value === star ? null : star)}
          >
            <Star
              size={14}
              className={filled ? 'text-yellow-400 fill-yellow-400' : ''}
            />
          </button>
        )
      })}
    </div>
  )
}
