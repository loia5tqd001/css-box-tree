/**
 * Display types based on CSS Display Module Level 3
 */
export type DisplayType =
  | 'block'
  | 'inline'
  | 'inline-block'
  | 'flex'
  | 'inline-flex'
  | 'grid'
  | 'inline-grid'
  | 'list-item'
  | 'none'
  | 'contents'
  | 'table'
  | 'inline-table'
  | 'table-row'
  | 'table-cell'
  | 'table-header-group'
  | 'table-footer-group'
  | 'table-row-group'
  | 'table-column'
  | 'table-column-group'
  | 'table-caption'
  | 'ruby'
  | 'ruby-base'
  | 'ruby-text'
  | 'ruby-base-container'
  | 'ruby-text-container'

/**
 * Box type classification
 */
export type BoxType =
  | 'block'
  | 'inline'
  | 'inline-block'
  | 'flex-container'
  | 'flex-item'
  | 'grid-container'
  | 'grid-item'
  | 'list-item'
  | 'list-marker'
  | 'anonymous-block'
  | 'anonymous-inline'
  | 'anonymous-flex-item'
  | 'anonymous-grid-item'
  | 'none'

/**
 * Represents a node in the CSS box tree
 */
export interface BoxNode {
  /** Unique identifier for this box node */
  id: string
  /** Type of box (block, inline, anonymous, etc.) */
  boxType: BoxType
  /** Display type from CSS */
  displayType: DisplayType | null
  /** The HTML element that generated this box (null for anonymous boxes) */
  element: Element | null
  /** Text content if this is a text node */
  textContent: string | null
  /** Tag name if element exists */
  tagName: string | null
  /** CSS classes if element exists */
  className: string | null
  /** Inline style attribute if element exists */
  style: string | null
  /** Children boxes */
  children: BoxNode[]
  /** Source location in original HTML (for highlighting) */
  sourceRange?: {
    start: number
    end: number
  }
  /** Whether this is an anonymous box (auto-generated) */
  isAnonymous: boolean
  /** Whether this box is empty */
  isEmpty: boolean
  /** Text node reference if this is from a text node */
  textNode?: Text
}

/**
 * Mapping from DOM elements to box node IDs for hover synchronization
 */
export interface ElementToBoxMap {
  elementToBoxId: Map<Element | Text, string>
  boxIdToElements: Map<string, (Element | Text)[]>
}

/**
 * Element metadata for tracking source positions
 */
export interface ElementMetadata {
  element: Element
  startOffset: number
  endOffset: number
}

/**
 * Default display types for HTML elements
 */
export const DEFAULT_DISPLAY_TYPES: Record<string, DisplayType> = {
  // Block-level elements
  div: 'block',
  p: 'block',
  section: 'block',
  article: 'block',
  header: 'block',
  footer: 'block',
  nav: 'block',
  aside: 'block',
  main: 'block',
  h1: 'block',
  h2: 'block',
  h3: 'block',
  h4: 'block',
  h5: 'block',
  h6: 'block',
  ul: 'block',
  ol: 'block',
  li: 'list-item',
  dl: 'block',
  dt: 'block',
  dd: 'block',
  blockquote: 'block',
  pre: 'block',
  hr: 'block',
  address: 'block',
  fieldset: 'block',
  legend: 'block',
  table: 'table',
  thead: 'table-header-group',
  tbody: 'table-row-group',
  tfoot: 'table-footer-group',
  tr: 'table-row',
  td: 'table-cell',
  th: 'table-cell',
  col: 'table-column',
  colgroup: 'table-column-group',
  caption: 'table-caption',
  // Inline-level elements
  span: 'inline',
  a: 'inline',
  em: 'inline',
  strong: 'inline',
  i: 'inline',
  b: 'inline',
  u: 'inline',
  small: 'inline',
  sub: 'inline',
  sup: 'inline',
  code: 'inline',
  kbd: 'inline',
  samp: 'inline',
  var: 'inline',
  mark: 'inline',
  time: 'inline',
  abbr: 'inline',
  acronym: 'inline',
  dfn: 'inline',
  cite: 'inline',
  q: 'inline',
  // Replaced elements (treated as inline by default)
  img: 'inline',
  input: 'inline',
  button: 'inline',
  select: 'inline',
  textarea: 'inline',
  iframe: 'inline',
  object: 'inline',
  embed: 'inline',
  video: 'inline',
  audio: 'inline',
  canvas: 'inline',
  // Special elements
  br: 'inline',
  wbr: 'inline',
}

