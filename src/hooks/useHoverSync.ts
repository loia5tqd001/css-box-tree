import { useState, useCallback } from 'react'

export function useHoverSync() {
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)

  const handleHover = useCallback((nodeId: string | null) => {
    setHighlightedNodeId(nodeId)
  }, [])

  return {
    highlightedNodeId,
    handleHover,
  }
}

