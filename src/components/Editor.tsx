import { useRef, useEffect } from 'react'
import MonacoEditor, { Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { ElementToBoxMap } from '../core/types'
import { parseHTML, getBodyElement } from '../core/parser'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onHover?: (nodeId: string | null) => void
  highlightedNodeId?: string | null
  elementMap?: ElementToBoxMap
}

/**
 * Parse HTML to find tag names and text positions
 */
interface HtmlToken {
  type: 'tag' | 'text'
  tagName?: string
  text?: string
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
}

/**
 * Simple HTML tokenizer to map editor positions to HTML elements
 */
function tokenizeHtml(html: string): HtmlToken[] {
  const tokens: HtmlToken[] = []
  const lines = html.split('\n')
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]
    
    // Find tags
    const tagRegex = /<\/?(\w+)[^>]*>/g
    let match = tagRegex.exec(line)
    while (match !== null) {
      tokens.push({
        type: 'tag',
        tagName: match[1].toLowerCase(),
        startLine: lineNum + 1,
        startColumn: match.index + 1,
        endLine: lineNum + 1,
        endColumn: match.index + match[0].length + 1,
      })
      match = tagRegex.exec(line)
    }
    
    // Find text content (simple approach)
    const textMatch = line.match(/>\s*([^<>\s]+)\s*</)
    if (textMatch && textMatch[1]) {
      const textStart = line.indexOf(textMatch[1])
      tokens.push({
        type: 'text',
        text: textMatch[1].trim(),
        startLine: lineNum + 1,
        startColumn: textStart + 1,
        endLine: lineNum + 1,
        endColumn: textStart + textMatch[1].length + 1,
      })
    }
  }
  
  return tokens
}

/**
 * Find box ID at editor position
 */
function findBoxIdAtPosition(
  line: number,
  column: number,
  tokens: HtmlToken[],
  elementMap: ElementToBoxMap,
  html: string
): string | null {
  // Find token at this position
  const token = tokens.find((t) => {
    if (t.startLine === line || t.endLine === line) {
      if (line === t.startLine && line === t.endLine) {
        return column >= t.startColumn && column <= t.endColumn
      }
      if (line === t.startLine) {
        return column >= t.startColumn
      }
      if (line === t.endLine) {
        return column <= t.endColumn
      }
      return true
    }
    return line > t.startLine && line < t.endLine
  })
  
  if (!token) return null
  
  try {
    const doc = parseHTML(html)
    const body = getBodyElement(doc)
    if (!body) return null
    
    if (token.type === 'tag' && token.tagName) {
      // Find element with matching tag
      const elements = body.querySelectorAll(token.tagName)
      for (const element of elements) {
        const boxId = elementMap.elementToBoxId.get(element)
        if (boxId) return boxId
      }
    } else if (token.type === 'text' && token.text) {
      // Find text node
      for (const [element, boxId] of elementMap.elementToBoxId.entries()) {
        if (element.nodeType === Node.TEXT_NODE) {
          const text = element.textContent?.trim()
          if (text === token.text) {
            return boxId
          }
        }
      }
    }
  } catch (error) {
    console.error('Error finding box at position:', error)
  }
  
  return null
}

export default function HtmlEditor({ value, onChange, onHover, highlightedNodeId, elementMap }: EditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const decorationsRef = useRef<string[]>([])
  const tokensRef = useRef<HtmlToken[]>([])

  // Update tokens when value changes
  useEffect(() => {
    tokensRef.current = tokenizeHtml(value)
  }, [value])

  // Handle incoming highlights from other components
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !highlightedNodeId || !elementMap) {
      // Clear decorations
      if (editorRef.current && decorationsRef.current.length > 0) {
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, [])
      }
      return
    }

    // Find matching tokens for this box ID
    const elements = elementMap.boxIdToElements.get(highlightedNodeId)
    if (!elements || elements.length === 0) return

    const decorations: editor.IModelDeltaDecoration[] = []

    for (const element of elements) {
      if (element.nodeType === Node.ELEMENT_NODE) {
        const tagName = (element as Element).tagName.toLowerCase()
        const matchingTokens = tokensRef.current.filter(
          (t) => t.type === 'tag' && t.tagName === tagName
        )
        for (const token of matchingTokens) {
          decorations.push({
            range: new monacoRef.current.Range(
              token.startLine,
              token.startColumn,
              token.endLine,
              token.endColumn
            ),
            options: {
              className: 'monaco-highlight',
              inlineClassName: 'monaco-highlight-inline',
            },
          })
        }
      } else if (element.nodeType === Node.TEXT_NODE) {
        const text = element.textContent?.trim()
        const matchingTokens = tokensRef.current.filter(
          (t) => t.type === 'text' && t.text === text
        )
        for (const token of matchingTokens) {
          decorations.push({
            range: new monacoRef.current.Range(
              token.startLine,
              token.startColumn,
              token.endLine,
              token.endColumn
            ),
            options: {
              className: 'monaco-highlight',
              inlineClassName: 'monaco-highlight-inline',
            },
          })
        }
      }
    }

    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, decorations)
  }, [highlightedNodeId, elementMap])

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Add mousemove listener for hover detection
    if (onHover && elementMap) {
      let currentHoveredBoxId: string | null = null

      editor.onMouseMove((e) => {
        if (!e.target.position) {
          if (currentHoveredBoxId !== null) {
            currentHoveredBoxId = null
            onHover(null)
          }
          return
        }

        const boxId = findBoxIdAtPosition(
          e.target.position.lineNumber,
          e.target.position.column,
          tokensRef.current,
          elementMap,
          value
        )

        if (boxId !== currentHoveredBoxId) {
          currentHoveredBoxId = boxId
          onHover(boxId)
        }
      })

      editor.onMouseLeave(() => {
        if (currentHoveredBoxId !== null) {
          currentHoveredBoxId = null
          onHover(null)
        }
      })
    }
  }

  return (
    <div className="editor-container" style={{ height: '100%' }}>
      <MonacoEditor
        height="100%"
        defaultLanguage="html"
        value={value}
        onChange={(newValue: string | undefined) => onChange(newValue || '')}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
        }}
      />
    </div>
  )
}

