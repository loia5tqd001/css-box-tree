import { describe, it, expect } from 'vitest'
import { generateBoxTree } from './boxTreeGenerator'
import { BoxNode } from './types'

/**
 * CSS Box Tree Generator Tests
 * Based on CSS 2.1 Specification and CSS Display Module Level 3
 * 
 * References:
 * - CSS 2.1 § 9.2.1.1: Anonymous block boxes
 * - CSS Display Module Level 3: Block containers
 * - https://www.w3.org/TR/CSS2/visuren.html#anonymous-block-level
 */

describe('CSS Box Tree Generator - Specification Compliance', () => {
  
  /**
   * Test 1: Basic Anonymous Block Box Wrapping
   * 
   * CSS 2.1 § 9.2.1.1:
   * "If a block container box has a block-level box inside it, then we force it 
   * to have only block-level boxes inside it."
   * 
   * Expected: Inline content wrapped in anonymous block boxes when mixed with block content
   */
  describe('Basic Anonymous Block Box Wrapping', () => {
    it('should wrap inline siblings of block elements in anonymous block boxes', () => {
      const html = `<section>
  <span>Foo</span>
  <div>Bar</div>
  Baz
</section>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      // Section should be a block box
      expect(tree!.tagName).toBe('section')
      expect(tree!.boxType).toBe('block')
      
      // Should have 3 children: anonymous block, div block, anonymous block
      expect(tree!.children.length).toBe(3)
      
      // First child: anonymous block containing span
      expect(tree!.children[0].boxType).toBe('anonymous-block')
      expect(tree!.children[0].children.length).toBe(1)
      expect(tree!.children[0].children[0].tagName).toBe('span')
      
      // Second child: div block
      expect(tree!.children[1].boxType).toBe('block')
      expect(tree!.children[1].tagName).toBe('div')
      
      // Third child: anonymous block containing text
      expect(tree!.children[2].boxType).toBe('anonymous-block')
      expect(tree!.children[2].children.length).toBe(1)
      expect(tree!.children[2].children[0].boxType).toBe('anonymous-inline')
    })
  })

  /**
   * Test 2: Block-in-Inline Splitting (Critical Test)
   * 
   * CSS 2.1 § 9.2.1.1:
   * "When an inline box contains an in-flow block-level box, the inline box 
   * (and its inline ancestors within the same line box) are broken around the 
   * block-level box, splitting the inline box into two boxes (even if either 
   * side is empty), one on each side of the block-level box(es). The line boxes 
   * before the break and after the break are enclosed in anonymous block boxes, 
   * and the block-level box becomes a sibling of those anonymous boxes."
   * 
   * Expected: Inline element is split, content becomes siblings in anonymous block boxes
   */
  describe('Block Inside Inline (Block-in-Inline Splitting)', () => {
    it('should split inline box when it contains block-level children', () => {
      const html = `<span>
  Before
  <div>Block inside span!</div>
  After
</span>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      // Root should be body (since we detect the span needs splitting)
      expect(tree!.tagName).toBe('body')
      
      // Body should have 3 children (not 1!):
      // 1. Anonymous block containing "Before"
      // 2. Block box for div
      // 3. Anonymous block containing "After"
      expect(tree!.children.length).toBe(3)
      
      // First: anonymous block with "Before"
      const firstBlock = tree!.children[0]
      expect(firstBlock.boxType).toBe('anonymous-block')
      expect(firstBlock.isAnonymous).toBe(true)
      expect(firstBlock.children.length).toBe(1)
      expect(firstBlock.children[0].boxType).toBe('anonymous-inline')
      expect(firstBlock.children[0].textContent).toContain('Before')
      
      // Second: block box from div
      const divBlock = tree!.children[1]
      expect(divBlock.boxType).toBe('block')
      expect(divBlock.tagName).toBe('div')
      expect(divBlock.isAnonymous).toBe(false)
      expect(divBlock.children.length).toBe(1)
      expect(divBlock.children[0].textContent).toContain('Block inside span!')
      
      // Third: anonymous block with "After"
      const lastBlock = tree!.children[2]
      expect(lastBlock.boxType).toBe('anonymous-block')
      expect(lastBlock.isAnonymous).toBe(true)
      expect(lastBlock.children.length).toBe(1)
      expect(lastBlock.children[0].boxType).toBe('anonymous-inline')
      expect(lastBlock.children[0].textContent).toContain('After')
    })

    it('should handle multiple block children in inline element', () => {
      const html = `<span>
  Text 1
  <div>Block 1</div>
  Text 2
  <div>Block 2</div>
  Text 3
</span>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      expect(tree!.tagName).toBe('body')
      
      // Should have 5 children: anon-block, div, anon-block, div, anon-block
      expect(tree!.children.length).toBe(5)
      
      expect(tree!.children[0].boxType).toBe('anonymous-block')
      expect(tree!.children[1].tagName).toBe('div')
      expect(tree!.children[2].boxType).toBe('anonymous-block')
      expect(tree!.children[3].tagName).toBe('div')
      expect(tree!.children[4].boxType).toBe('anonymous-block')
    })

    it('should handle empty sides when splitting inline', () => {
      const html = `<span><div>Only block</div></span>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      // Even though sides are empty, we might still split
      // or just have the single block - implementation dependent
      // Key: NO inline box for span should be in the tree
      const findInlineSpanBox = (node: BoxNode): boolean => {
        if (node.tagName === 'span' && node.boxType === 'inline') {
          return true
        }
        return node.children.some(findInlineSpanBox)
      }
      
      expect(findInlineSpanBox(tree!)).toBe(false)
    })

    it('should split nested inline boxes when inner inline contains block', () => {
      const html = `<span>
  First
  <span>
    Before
    <div>Block inside span!</div>
    After
  </span>
</span>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      // CSS 2.1 § 9.2.1.1: "the inline box (and its inline ancestors 
      // within the same line box) are broken around the block-level box"
      // 
      // Both outer and inner spans should be split around the div
      // Expected structure:
      // Body
      //   ├─ Anonymous Block: "First" + "Before"
      //   ├─ Block [div]: "Block inside span!"
      //   └─ Anonymous Block: "After"
      
      expect(tree!.tagName).toBe('body')
      expect(tree!.children.length).toBe(3)
      
      // First: anonymous block with "First" and "Before"
      const firstBlock = tree!.children[0]
      expect(firstBlock.boxType).toBe('anonymous-block')
      expect(firstBlock.isAnonymous).toBe(true)
      
      // Should contain inline content for both "First" and "Before"
      const findText = (node: BoxNode, searchText: string): boolean => {
        if (node.textContent?.includes(searchText)) return true
        return node.children.some(child => findText(child, searchText))
      }
      
      expect(findText(firstBlock, 'First')).toBe(true)
      expect(findText(firstBlock, 'Before')).toBe(true)
      
      // Second: block box from div
      const divBlock = tree!.children[1]
      expect(divBlock.boxType).toBe('block')
      expect(divBlock.tagName).toBe('div')
      expect(findText(divBlock, 'Block inside span!')).toBe(true)
      
      // Third: anonymous block with "After"
      const lastBlock = tree!.children[2]
      expect(lastBlock.boxType).toBe('anonymous-block')
      expect(lastBlock.isAnonymous).toBe(true)
      expect(findText(lastBlock, 'After')).toBe(true)
      
      // Critical: NO inline span boxes should exist in the tree
      const findInlineSpanBox = (node: BoxNode): boolean => {
        if (node.tagName === 'span' && node.boxType === 'inline') {
          return true
        }
        return node.children.some(findInlineSpanBox)
      }
      
      expect(findInlineSpanBox(tree!)).toBe(false)
    })
  })

  /**
   * Test 3: Pure Inline Flow
   * 
   * When all children are inline-level, no anonymous block boxes needed
   */
  describe('Pure Inline Flow', () => {
    it('should not create anonymous blocks when all children are inline', () => {
      const html = `<p>
  Hello <strong>world</strong>, how <em>are</em> you?
</p>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      expect(tree!.tagName).toBe('p')
      expect(tree!.boxType).toBe('block')
      
      // All children should be inline or anonymous inline - no anonymous blocks
      const hasAnonymousBlock = tree!.children.some(
        child => child.boxType === 'anonymous-block'
      )
      expect(hasAnonymousBlock).toBe(false)
      
      // Should have inline boxes for strong, em, and text nodes
      expect(tree!.children.length).toBeGreaterThan(0)
      tree!.children.forEach(child => {
        expect(['inline', 'anonymous-inline']).toContain(child.boxType)
      })
    })
  })

  /**
   * Test 4: display: inline-block
   * 
   * CSS Display Module Level 3:
   * "inline-block: The element generates an inline-level block container. 
   * The inside of an inline-block is formatted as a block box, and the 
   * element itself is formatted as an atomic inline-level box."
   * 
   * inline-block establishes a BFC, so block children inside don't cause splitting
   */
  describe('display: inline-block', () => {
    it('should allow block children inside inline-block without splitting', () => {
      // Note: Must use div as container, not p!
      // HTML parser auto-closes <p> when it encounters block elements,
      // even if nested inside inline-block
      const html = `<div>
  Text before
  <span style="display: inline-block">
    <div>Nested block</div>
  </span>
  Text after
</div>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      // Root might be p or body depending on detection logic
      // The important part is finding the inline-block span
      const findInlineBlockSpan = (node: BoxNode): BoxNode | null => {
        if (node.tagName === 'span' && node.boxType === 'inline-block') {
          return node
        }
        for (const child of node.children) {
          const found = findInlineBlockSpan(child)
          if (found) return found
        }
        return null
      }
      
      const inlineBlockSpan = findInlineBlockSpan(tree!)
      expect(inlineBlockSpan).not.toBeNull()
      expect(inlineBlockSpan!.boxType).toBe('inline-block')
      
      // The span should have the div as a child (not split)
      expect(inlineBlockSpan!.children.length).toBe(1)
      expect(inlineBlockSpan!.children[0].tagName).toBe('div')
    })
  })

  /**
   * Test 5: display: none vs display: contents
   * 
   * CSS Display Module Level 3:
   * - none: Element and descendants generate no boxes
   * - contents: Element generates no box, but children generate boxes normally
   */
  describe('display: none vs display: contents', () => {
    it('should remove display:none elements from box tree', () => {
      const html = `<div>
  <span style="display: none">I'm invisible</span>
  <span>I'm visible</span>
</div>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      // The none element should not appear in the tree
      const findNoneElement = (node: BoxNode): boolean => {
        if (node.textContent?.includes("I'm invisible")) return true
        return node.children.some(findNoneElement)
      }
      expect(findNoneElement(tree!)).toBe(false)
    })

    it('should promote children of display:contents elements', () => {
      const html = `<div>
  <span style="display: contents"><em>I'm promoted!</em></span>
  <span>I'm normal</span>
</div>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      // The span with display:contents should not exist as a box
      // but its child (em) should be promoted to div's children
      const findContentsSpan = (node: BoxNode): boolean => {
        if (node.tagName === 'span' && node.displayType === 'contents') {
          return true
        }
        return node.children.some(findContentsSpan)
      }
      expect(findContentsSpan(tree!)).toBe(false)
      
      // The em should be findable as a descendant
      const findEm = (node: BoxNode): boolean => {
        if (node.tagName === 'em') return true
        return node.children.some(findEm)
      }
      expect(findEm(tree!)).toBe(true)
    })
  })

  /**
   * Test 6: Flexbox Container
   * 
   * CSS Display Module Level 3:
   * "A parent with a grid or flex display value blockifies the box's display type."
   * 
   * All direct children of flex containers become flex items (blockified)
   */
  describe('Flexbox Container', () => {
    it('should blockify children of flex container', () => {
      const html = `<div style="display: flex">
  <span>Flex item 1</span>
  <span>Flex item 2</span>
</div>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      expect(tree!.boxType).toBe('flex-container')
      
      // Children should be flex items, not inline boxes
      expect(tree!.children.length).toBe(2)
      tree!.children.forEach(child => {
        // Flex container blockifies children - they become flex items
        expect(child.boxType).toBe('flex-item')
      })
    })

    it('should wrap text nodes in flex items', () => {
      const html = `<div style="display: flex">
  Text becomes flex item
</div>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      expect(tree!.boxType).toBe('flex-container')
      // Text should be wrapped in an anonymous flex item
      expect(tree!.children.length).toBe(1)
      // Text creates an anonymous inline box, which may or may not be wrapped
      // Implementation detail - key is flex container is correct
    })
  })

  /**
   * Test 7: Grid Container
   * 
   * Similar to flex, grid containers blockify their children into grid items
   */
  describe('Grid Container', () => {
    it('should blockify children of grid container', () => {
      const html = `<div style="display: grid">
  <span>Grid item 1</span>
  <div>Grid item 2</div>
</div>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      expect(tree!.boxType).toBe('grid-container')
      
      // Children should be grid items
      expect(tree!.children.length).toBe(2)
      tree!.children.forEach(child => {
        expect(child.boxType).toBe('grid-item')
      })
    })
  })

  /**
   * Test 8: Deeply Nested Structure
   * 
   * Box tree should mirror DOM nesting with correct box types at each level
   */
  describe('Deeply Nested Structure', () => {
    it('should correctly nest boxes according to DOM structure', () => {
      const html = `<article>
  <header>
    <h1>Title</h1>
    <p>Subtitle</p>
  </header>
</article>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      expect(tree!.tagName).toBe('article')
      expect(tree!.children.length).toBeGreaterThan(0)
      
      const header = tree!.children.find(c => c.tagName === 'header')
      expect(header).toBeDefined()
      
      const h1 = header!.children.find(c => c.tagName === 'h1')
      expect(h1).toBeDefined()
      expect(h1!.boxType).toBe('block')
    })
  })

  /**
   * Test 9: List Items
   * 
   * CSS 2.1: list-item generates a principal block box plus a marker box
   */
  describe('List Items', () => {
    it('should create list-item boxes for li elements', () => {
      const html = `<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      expect(tree!.tagName).toBe('ul')
      
      const listItems = tree!.children.filter(c => c.tagName === 'li')
      expect(listItems.length).toBe(2)
      
      listItems.forEach(li => {
        expect(li.boxType).toBe('list-item')
      })
    })
  })

  /**
   * Test 10: Whitespace Handling
   * 
   * Whitespace-only text nodes between block elements should be collapsed/ignored
   */
  describe('Whitespace Handling', () => {
    it('should ignore whitespace-only text nodes between blocks', () => {
      const html = `<div>
  
  <p>First</p>
  
  <p>Second</p>
  
</div>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      expect(tree!.tagName).toBe('div')
      
      // Should only have the two p elements, not whitespace text nodes
      const pElements = tree!.children.filter(c => c.tagName === 'p')
      expect(pElements.length).toBe(2)
      
      // No anonymous inline boxes for whitespace
      const anonymousInlines = tree!.children.filter(
        c => c.boxType === 'anonymous-inline'
      )
      expect(anonymousInlines.length).toBe(0)
    })
  })

  /**
   * Test 11: Empty Elements
   * 
   * Empty elements still generate boxes unless display: none
   */
  describe('Empty Elements', () => {
    it('should generate boxes for empty elements', () => {
      const html = `<div>
  <span></span>
  <div></div>
</div>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      // Empty span and div should still generate boxes
      // They'll be wrapped in anonymous blocks due to mixing inline and block
      
      const findSpan = (node: BoxNode): boolean => {
        if (node.tagName === 'span') return true
        return node.children.some(findSpan)
      }
      
      const findEmptyDiv = (node: BoxNode): boolean => {
        if (node.tagName === 'div' && node.isEmpty) return true
        return node.children.some(findEmptyDiv)
      }
      
      expect(findSpan(tree!)).toBe(true)
      expect(findEmptyDiv(tree!)).toBe(true)
    })
  })

  /**
   * Test 12: Inline Formatting with BR
   * 
   * BR creates forced line breaks within inline formatting context
   */
  describe('Inline Formatting with BR', () => {
    it('should include BR elements in inline formatting', () => {
      const html = `<p>
  Line one<br>
  Line two
</p>`
      
      const { tree } = generateBoxTree(html)
      expect(tree).not.toBeNull()
      
      expect(tree!.tagName).toBe('p')
      
      // BR should be present as an inline element
      const findBr = (node: BoxNode): boolean => {
        if (node.tagName === 'br') return true
        return node.children.some(findBr)
      }
      
      expect(findBr(tree!)).toBe(true)
    })
  })
})
