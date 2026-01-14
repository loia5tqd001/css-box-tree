import { DisplayType, DEFAULT_DISPLAY_TYPES } from './types'

/**
 * Parses inline style attribute and extracts display property
 */
export function getDisplayFromStyle(styleAttr: string | null): DisplayType | null {
  if (!styleAttr) return null

  // Simple CSS parser for inline styles
  // Format: "property: value; property2: value2;"
  const displayMatch = styleAttr.match(/display\s*:\s*([^;]+)/i)
  if (!displayMatch) return null

  const displayValue = displayMatch[1].trim().toLowerCase()

  // Map CSS display values to our DisplayType
  const displayMap: Record<string, DisplayType> = {
    'block': 'block',
    'inline': 'inline',
    'inline-block': 'inline-block',
    'flex': 'flex',
    'inline-flex': 'inline-flex',
    'grid': 'grid',
    'inline-grid': 'inline-grid',
    'list-item': 'list-item',
    'none': 'none',
    'contents': 'contents',
    'table': 'table',
    'inline-table': 'inline-table',
    'table-row': 'table-row',
    'table-cell': 'table-cell',
    'table-header-group': 'table-header-group',
    'table-footer-group': 'table-footer-group',
    'table-row-group': 'table-row-group',
    'table-column': 'table-column',
    'table-column-group': 'table-column-group',
    'table-caption': 'table-caption',
    'ruby': 'ruby',
    'ruby-base': 'ruby-base',
    'ruby-text': 'ruby-text',
    'ruby-base-container': 'ruby-base-container',
    'ruby-text-container': 'ruby-text-container',
  }

  return displayMap[displayValue] || null
}

/**
 * Gets the computed display type for an element
 * Priority: inline style > default HTML element type
 */
export function getComputedDisplayType(element: Element): DisplayType {
  // Check inline style first
  const styleAttr = element.getAttribute('style')
  const styleDisplay = getDisplayFromStyle(styleAttr)
  if (styleDisplay) {
    return styleDisplay
  }

  // Fall back to default display type for HTML element
  const tagName = element.tagName.toLowerCase()
  return DEFAULT_DISPLAY_TYPES[tagName] || 'block'
}

/**
 * Checks if a display type generates a box
 */
export function generatesBox(displayType: DisplayType): boolean {
  return displayType !== 'none'
}

/**
 * Checks if a display type is contents (children are promoted)
 */
export function isContents(displayType: DisplayType): boolean {
  return displayType === 'contents'
}

/**
 * Checks if a display type is block-level
 */
export function isBlockLevel(displayType: DisplayType): boolean {
  return [
    'block',
    'flex',
    'grid',
    'list-item',
    'table',
    'table-caption',
    'table-header-group',
    'table-footer-group',
    'table-row-group',
    'table-column-group',
    'table-column',
    'table-row',
    'table-cell',
  ].includes(displayType)
}

/**
 * Checks if a display type is inline-level
 */
export function isInlineLevel(displayType: DisplayType): boolean {
  return [
    'inline',
    'inline-block',
    'inline-flex',
    'inline-grid',
    'inline-table',
    'ruby',
    'ruby-base',
    'ruby-text',
    'ruby-base-container',
    'ruby-text-container',
  ].includes(displayType)
}

/**
 * Checks if a display type establishes a block formatting context
 */
/**
 * Checks if a display type establishes a block formatting context
 * 
 * CSS 2.1 § 9.4.1: Block formatting contexts are established by:
 * - flow-root (explicitly)
 * - inline-blocks
 * - table cells, table captions
 * - flex/grid containers
 * 
 * Note: Regular 'block' boxes do NOT always establish BFC!
 * They only establish BFC with certain properties like overflow !== visible
 */
export function establishesBlockFormattingContext(displayType: DisplayType): boolean {
  return [
    'flow-root',
    'inline-block',
    'flex',
    'inline-flex',
    'grid',
    'inline-grid',
    'table',
    'inline-table',
    'table-cell',
    'table-caption',
  ].includes(displayType)
}

/**
 * Checks if a display type blockifies its children (flex, grid)
 */
export function blockifiesChildren(displayType: DisplayType): boolean {
  return ['flex', 'inline-flex', 'grid', 'inline-grid'].includes(displayType)
}

/**
 * Checks if a display type is a block container
 * A block container can contain block boxes
 */
export function isBlockContainer(displayType: DisplayType): boolean {
  return [
    'block',
    'flow-root',
    'inline-block',
    'table-cell',
    'list-item',
  ].includes(displayType)
}

