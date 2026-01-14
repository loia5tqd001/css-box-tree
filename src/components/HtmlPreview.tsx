import { useEffect, useRef } from 'react'
import { BoxNode, ElementToBoxMap } from '../core/types'

/**
 * Sets up hover handlers by matching iframe elements to box nodes
 */
function setupHoverHandlers(
  doc: Document,
  boxTree: BoxNode,
  _elementMap: ElementToBoxMap,
  onHover?: (nodeId: string | null) => void
) {
  // Match elements by tag name, class, and position in tree
  function findBoxIdForElement(element: Element): string | null {
    const tagName = element.tagName.toLowerCase()
    const className = element.className || ''
    
    // Try to find matching box node by traversing the box tree
    function findMatchingBox(node: BoxNode, depth: number = 0): BoxNode | null {
      // Match by tag name
      if (node.tagName === tagName) {
        // If class names match (or both empty), it's likely a match
        const nodeClass = node.className || ''
        if (nodeClass === className) {
          return node
        }
        // If no class specified, still consider it a match
        if (!className && !nodeClass) {
          return node
        }
      }
      
      // Search children
      for (const child of node.children) {
        const found = findMatchingBox(child, depth + 1)
        if (found) return found
      }
      return null
    }
    
    const match = findMatchingBox(boxTree)
    return match?.id || null
  }

  // Add hover handlers to all elements
  const allElements = doc.querySelectorAll('*')
  allElements.forEach((el) => {
    el.addEventListener('mouseenter', (e) => {
      e.stopPropagation()
      const boxId = findBoxIdForElement(el as Element)
      if (boxId) {
        onHover?.(boxId)
      }
    })
    el.addEventListener('mouseleave', () => {
      onHover?.(null)
    })
  })

  // Handle text nodes - match by text content
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const textNodeMap = new Map<string, string>() // text -> boxId
  
  // First pass: build text to boxId mapping
  function buildTextMap(node: BoxNode) {
    if (node.textContent && node.textContent.trim().length > 0) {
      const text = node.textContent.trim()
      if (!textNodeMap.has(text)) {
        textNodeMap.set(text, node.id)
      }
    }
    for (const child of node.children) {
      buildTextMap(child)
    }
  }
  buildTextMap(boxTree)
  
  // Second pass: wrap text nodes
  let currentTextNode = walker.nextNode()
  while (currentTextNode) {
    const text = currentTextNode.textContent?.trim() || ''
    if (text.length > 0) {
      const boxId = textNodeMap.get(text)
      if (boxId) {
        // Wrap in span for hover
        const span = doc.createElement('span')
        span.style.cursor = 'pointer'
        span.style.display = 'inline'
        span.setAttribute('data-box-id', boxId)
        span.addEventListener('mouseenter', () => {
          onHover?.(boxId)
        })
        span.addEventListener('mouseleave', () => {
          onHover?.(null)
        })
        currentTextNode.parentNode?.replaceChild(span, currentTextNode)
        span.appendChild(currentTextNode)
      }
    }
    currentTextNode = walker.nextNode()
  }
}

interface HtmlPreviewProps {
  html: string
  boxTree: BoxNode | null
  highlightedNodeId?: string | null
  onHover?: (nodeId: string | null) => void
  elementMap?: ElementToBoxMap
}

export default function HtmlPreview({
  html,
  boxTree,
  highlightedNodeId,
  onHover,
  elementMap,
}: HtmlPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    if (!previewRef.current) return

    // Clear previous content
    previewRef.current.innerHTML = ''

    // Create a sandboxed iframe to render HTML safely
    const iframe = document.createElement('iframe')
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = 'none'
    iframe.style.background = '#fff'
    iframeRef.current = iframe

    iframe.onload = () => {
      if (!iframe.contentDocument || !iframe.contentWindow) return

      const doc = iframe.contentDocument
      
      // Write the HTML content
      doc.open()
      doc.write(html)
      doc.close()
      
      // Wait for content to be ready
      setTimeout(() => {
        if (!iframe.contentDocument) return
        
        // Inject CSS for highlighting
        const style = doc.createElement('style')
        style.textContent = `
          .box-tree-highlight {
            outline: 2px solid #58a6ff !important;
            outline-offset: 2px !important;
            background-color: rgba(88, 166, 255, 0.1) !important;
          }
          * {
            cursor: pointer;
          }
        `
        doc.head.appendChild(style)

        // Add hover handlers using element matching by tag/position
        if (elementMap && boxTree) {
          setupHoverHandlers(doc, boxTree, elementMap, onHover)
        }
      }, 10)
    }

    previewRef.current.appendChild(iframe)

    return () => {
      if (previewRef.current && iframe.parentNode) {
        previewRef.current.removeChild(iframe)
      }
      iframeRef.current = null
    }
  }, [html, elementMap, boxTree, onHover])

  useEffect(() => {
    if (!highlightedNodeId || !boxTree || !iframeRef.current?.contentDocument) {
      return
    }

    const doc = iframeRef.current.contentDocument
    
    // Remove previous highlights
    doc.querySelectorAll('.box-tree-highlight').forEach((el) => {
      el.classList.remove('box-tree-highlight')
    })

    // Find the box node
    function findBoxNode(node: BoxNode, id: string): BoxNode | null {
      if (node.id === id) return node
      for (const child of node.children) {
        const found = findBoxNode(child, id)
        if (found) return found
      }
      return null
    }

    const boxNode = findBoxNode(boxTree, highlightedNodeId)
    if (!boxNode) return

    // Highlight corresponding elements in iframe
    if (boxNode.tagName) {
      // Find elements by tag name
      const elements = doc.querySelectorAll(boxNode.tagName)
      elements.forEach((el) => {
        // Match by tag name and optionally class name
        if (boxNode.className) {
          const elClasses = el.className || ''
          if (elClasses.includes(boxNode.className)) {
            el.classList.add('box-tree-highlight')
          }
        } else {
          // If multiple elements with same tag, highlight all (could be improved)
          el.classList.add('box-tree-highlight')
        }
      })
    }

    // Highlight text content
    if (boxNode.textContent) {
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
      let textNode = walker.nextNode()
      while (textNode) {
        if (textNode.textContent?.trim() === boxNode.textContent.trim()) {
          if (textNode.parentElement) {
            textNode.parentElement.classList.add('box-tree-highlight')
          }
        }
        textNode = walker.nextNode()
      }
    }
  }, [highlightedNodeId, boxTree])

  return (
    <div className="html-preview" ref={previewRef} />
  )
}

