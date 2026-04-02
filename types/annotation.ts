// types/annotation.ts

export interface Annotation {
  id: string
  runId: string
  /** null = annotation on the whole run; otherwise "provider/model-id" */
  provider: string | null
  thumbs: boolean | null     // true = up, false = down, null = unset
  rating: number | null      // 1–5, null = unset
  notes: string              // empty string means no notes
  createdAt: string          // ISO 8601
  updatedAt: string          // ISO 8601
}
