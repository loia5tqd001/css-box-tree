/**
 * Parses HTML string into a Document
 */
export function parseHTML(html: string): Document {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return doc
}

/**
 * Gets the body element from parsed HTML
 */
export function getBodyElement(doc: Document): Element | null {
  return doc.body || doc.documentElement
}

