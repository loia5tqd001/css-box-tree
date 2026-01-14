import { useState } from 'react'
import { BoxNode } from '../core/types'

interface TreeNodeProps {
  node: BoxNode
  level?: number
  onHover?: (nodeId: string | null) => void
  highlightedNodeId?: string | null
}

function getBoxTypeLabel(boxType: BoxNode['boxType']): string {
  const labels: Record<BoxNode['boxType'], string> = {
    'block': 'Block Box',
    'inline': 'Inline Box',
    'inline-block': 'Inline Block Box',
    'flex-container': 'Flex Container',
    'flex-item': 'Flex Item',
    'grid-container': 'Grid Container',
    'grid-item': 'Grid Item',
    'list-item': 'List Item Box',
    'list-marker': 'Marker Box',
    'anonymous-block': 'Anonymous Block Box',
    'anonymous-inline': 'Anonymous Inline Box',
    'anonymous-flex-item': 'Anonymous Flex Item',
    'anonymous-grid-item': 'Anonymous Grid Item',
    'none': 'None',
  }
  return labels[boxType] || boxType
}

function getBoxTypeIcon(boxType: BoxNode['boxType']): string {
  if (boxType.includes('anonymous')) return '⊡'
  if (boxType.includes('flex')) return '⊞'
  if (boxType.includes('grid')) return '⊠'
  if (boxType === 'block') return '▦'
  if (boxType === 'inline' || boxType === 'inline-block') return '▤'
  if (boxType === 'list-item') return '▧'
  return '▩'
}

export default function TreeNode({
  node,
  level = 0,
  onHover,
  highlightedNodeId,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const isHighlighted = highlightedNodeId === node.id

  const handleMouseEnter = () => {
    onHover?.(node.id)
  }

  const handleMouseLeave = () => {
    onHover?.(null)
  }

  const indent = level * 20

  return (
    <div
      className={`tree-node ${isHighlighted ? 'highlighted' : ''}`}
      data-box-type={node.boxType}
      style={{ marginLeft: `${indent}px` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="tree-node-header">
        {hasChildren && (
          <button
            className="tree-node-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <span className="tree-node-spacer" />}
        <span className="tree-node-icon">{getBoxTypeIcon(node.boxType)}</span>
        <span className="tree-node-label">
          {getBoxTypeLabel(node.boxType)}
          {node.tagName && !node.isAnonymous && (
            <span className="tree-node-tag"> [{node.tagName}]</span>
          )}
          {node.textContent && (
            <span className="tree-node-text"> "{node.textContent.trim()}"</span>
          )}
          {node.isAnonymous && (
            <span className="tree-node-anonymous"> (anonymous)</span>
          )}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div className="tree-node-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onHover={onHover}
              highlightedNodeId={highlightedNodeId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

