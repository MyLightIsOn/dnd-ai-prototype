import React from 'react'
import type { Edge } from '@xyflow/react'
import type { TypedNode } from '@/types'
import { parseWorkflowJSON } from './parseWorkflow'

export async function importJSON({
  e,
  setNodes,
  setEdges,
}: {
  e: React.ChangeEvent<HTMLInputElement>
  setNodes: React.Dispatch<React.SetStateAction<TypedNode[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
}) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const text = typeof reader.result === 'string' ? reader.result : ''
    const result = parseWorkflowJSON(text)
    if (!result) {
      alert('Invalid JSON')
      return
    }
    setNodes(result.nodes)
    setEdges(result.edges)
  }
  reader.readAsText(file)
}
