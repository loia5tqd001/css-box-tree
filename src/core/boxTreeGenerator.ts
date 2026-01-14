import { BoxNode, DisplayType, BoxType, ElementToBoxMap } from './types';
import {
  getComputedDisplayType,
  generatesBox,
  isContents,
  isBlockLevel,
  isInlineLevel,
  establishesBlockFormattingContext,
  blockifiesChildren,
  isBlockContainer,
} from './styleResolver';
import { parseHTML, getBodyElement } from './parser';

let nodeIdCounter = 0;

function generateId(): string {
  return `box-${++nodeIdCounter}`;
}

/**
 * Creates an anonymous block box
 */
function createAnonymousBlockBox(): BoxNode {
  return {
    id: generateId(),
    boxType: 'anonymous-block',
    displayType: null,
    element: null,
    textContent: null,
    tagName: null,
    className: null,
    style: null,
    children: [],
    isAnonymous: true,
    isEmpty: false,
  };
}

/**
 * Creates an anonymous inline box
 */
function createAnonymousInlineBox(
  textContent: string,
  textNode?: Text
): BoxNode {
  return {
    id: generateId(),
    boxType: 'anonymous-inline',
    displayType: null,
    element: null,
    textContent,
    tagName: null,
    className: null,
    style: null,
    children: [],
    isAnonymous: true,
    isEmpty: textContent.trim().length === 0,
    textNode,
  };
}

/**
 * Creates an anonymous flex item box (for text nodes in flex containers)
 */
function createAnonymousFlexItem(
  textContent: string,
  textNode?: Text
): BoxNode {
  return {
    id: generateId(),
    boxType: 'anonymous-flex-item',
    displayType: null,
    element: null,
    textContent,
    tagName: null,
    className: null,
    style: null,
    children: [],
    isAnonymous: true,
    isEmpty: textContent.trim().length === 0,
    textNode,
  };
}

/**
 * Creates an anonymous grid item box (for text nodes in grid containers)
 */
function createAnonymousGridItem(
  textContent: string,
  textNode?: Text
): BoxNode {
  return {
    id: generateId(),
    boxType: 'anonymous-grid-item',
    displayType: null,
    element: null,
    textContent,
    tagName: null,
    className: null,
    style: null,
    children: [],
    isAnonymous: true,
    isEmpty: textContent.trim().length === 0,
    textNode,
  };
}

/**
 * Determines box type from display type
 */
function getBoxTypeFromDisplay(
  displayType: DisplayType,
  isListItem: boolean
): BoxType {
  if (isListItem) {
    return 'list-item';
  }

  switch (displayType) {
    case 'block':
      return 'block';
    case 'inline':
      return 'inline';
    case 'inline-block':
      return 'inline-block';
    case 'flex':
      return 'flex-container';
    case 'inline-flex':
      return 'flex-container';
    case 'grid':
      return 'grid-container';
    case 'inline-grid':
      return 'grid-container';
    default:
      return 'block';
  }
}

/**
 * Creates a box node from an element
 */
function createBoxFromElement(
  element: Element,
  displayType: DisplayType,
  parentBlockifies: boolean,
  parentDisplayType?: DisplayType | null
): BoxNode {
  const isListItem = displayType === 'list-item';
  let boxType: BoxType = getBoxTypeFromDisplay(displayType, isListItem);

  // If parent blockifies (flex/grid), children become flex/grid items
  if (parentBlockifies && parentDisplayType) {
    // Determine the correct item type based on parent type
    const parentIsGrid =
      parentDisplayType === 'grid' || parentDisplayType === 'inline-grid';

    if (displayType === 'flex' || displayType === 'inline-flex') {
      boxType = parentIsGrid ? 'grid-item' : 'flex-item';
    } else if (displayType === 'grid' || displayType === 'inline-grid') {
      boxType = parentIsGrid ? 'grid-item' : 'flex-item';
    } else {
      // Regular elements become the appropriate item type
      boxType = parentIsGrid ? 'grid-item' : 'flex-item';
    }
  }

  const box: BoxNode = {
    id: generateId(),
    boxType,
    displayType,
    element,
    textContent: null,
    tagName: element.tagName.toLowerCase(),
    className: element.className || null,
    style: element.getAttribute('style') || null,
    children: [],
    isAnonymous: false,
    isEmpty:
      element.children.length === 0 &&
      (!element.textContent || element.textContent.trim().length === 0),
  };

  return box;
}

/**
 * Checks if text content is only whitespace
 */
function isWhitespaceOnly(text: string): boolean {
  return text.trim().length === 0;
}

/**
 * Checks if an element has any block-level children (for detecting block-in-inline)
 *
 * CSS 2.1 § 9.2.1.1: "the inline box (and its inline ancestors within the same
 * line box) are broken around the block-level box"
 *
 * This means we need to check:
 * 1. Direct block-level children
 * 2. Nested inline children that themselves contain blocks (cascading split)
 */
function hasBlockLevelChildren(element: Element): boolean {
  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i];
    if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as Element;
      const displayType = getComputedDisplayType(child);

      if (!generatesBox(displayType) || isContents(displayType)) {
        continue;
      }

      // Direct block-level child
      if (isBlockLevel(displayType)) {
        return true;
      }

      // Inline child that establishes BFC (like inline-block) - doesn't cascade split
      const childEstablishesBFC =
        establishesBlockFormattingContext(displayType);
      if (childEstablishesBFC) {
        continue;
      }

      // Inline child that contains blocks - cascading split!
      if (isInlineLevel(displayType) && hasBlockLevelChildren(child)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * CSS 2.1 § 9.2.1.1: Block-in-Inline Splitting
 *
 * When an inline box contains an in-flow block-level box, the inline box is split around
 * the block-level box, creating:
 * 1. Anonymous block box containing inline content before the block
 * 2. The block-level box(es) themselves
 * 3. Anonymous block box containing inline content after the block
 *
 * These boxes become siblings (not children of the inline element).
 */
function processInlineWithBlockChildren(
  inlineElement: Element,
  inlineDisplayType: DisplayType,
  parentBlockifies: boolean
): BoxNode[] {
  const result: BoxNode[] = [];
  const childNodes: (Element | Text)[] = [];

  // Collect all child nodes
  for (let i = 0; i < inlineElement.childNodes.length; i++) {
    const node = inlineElement.childNodes[i];
    if (
      node.nodeType === Node.ELEMENT_NODE ||
      node.nodeType === Node.TEXT_NODE
    ) {
      childNodes.push(node as Element | Text);
    }
  }

  let currentInlineContent: BoxNode[] = [];

  for (const node of childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const text = textNode.textContent || '';

      // Skip whitespace-only text between blocks
      if (!isWhitespaceOnly(text)) {
        // Add text to current inline content
        currentInlineContent.push(createAnonymousInlineBox(text, textNode));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const displayType = getComputedDisplayType(element);

      if (!generatesBox(displayType)) {
        continue;
      }

      if (isContents(displayType)) {
        // Handle display: contents - expand its children here
        const contentsChildren = processChildren(
          element,
          inlineDisplayType,
          null
        );
        currentInlineContent.push(...contentsChildren);
        continue;
      }

      const isBlock = isBlockLevel(displayType);

      if (isBlock) {
        // Found a block-level child - this causes the split

        // 1. Wrap any preceding inline content in an anonymous block box
        if (currentInlineContent.length > 0) {
          const anonymousBlock = createAnonymousBlockBox();
          anonymousBlock.children = currentInlineContent;
          result.push(anonymousBlock);
          currentInlineContent = [];
        }

        // 2. Add the block-level box itself
        const blockBox = createBoxFromElement(
          element,
          displayType,
          parentBlockifies,
          null
        );
        blockBox.children = processChildren(
          element,
          displayType,
          blockBox.boxType
        );
        result.push(blockBox);
      } else {
        // Inline-level child

        // Check if this inline child itself contains blocks (cascading split!)
        const childEstablishesBFC =
          establishesBlockFormattingContext(displayType);
        const childHasBlocks =
          !childEstablishesBFC && hasBlockLevelChildren(element);

        if (childHasBlocks) {
          // This inline child also needs to be split!
          // CSS 2.1: "the inline box (and its inline ancestors within the same line box)
          // are broken around the block-level box"
          //
          // This means we should merge the inline content from the nested element
          // with the current level's inline content, not create separate blocks

          const nestedSplitBoxes = processInlineWithBlockChildren(
            element,
            displayType,
            parentBlockifies
          );

          // Merge the split boxes:
          // - First box (anonymous block with inline content before) -> merge into currentInlineContent
          // - Middle boxes (blocks) -> close current inline content and add blocks
          // - Last box (anonymous block with inline content after) -> start new inline content

          for (let j = 0; j < nestedSplitBoxes.length; j++) {
            const nestedBox = nestedSplitBoxes[j];

            if (nestedBox.boxType === 'anonymous-block') {
              // This is inline content from the split - merge it
              currentInlineContent.push(...nestedBox.children);
            } else {
              // This is a block box from the split
              // Wrap any preceding inline content
              if (currentInlineContent.length > 0) {
                const anonymousBlock = createAnonymousBlockBox();
                anonymousBlock.children = currentInlineContent;
                result.push(anonymousBlock);
                currentInlineContent = [];
              }
              // Add the block
              result.push(nestedBox);
            }
          }
        } else {
          // Normal inline child - add to current inline content
          const inlineBox = createBoxFromElement(
            element,
            displayType,
            parentBlockifies,
            null
          );
          inlineBox.children = processChildren(
            element,
            displayType,
            inlineBox.boxType
          );
          currentInlineContent.push(inlineBox);
        }
      }
    }
  }

  // 3. Wrap any remaining inline content in an anonymous block box
  if (currentInlineContent.length > 0) {
    const anonymousBlock = createAnonymousBlockBox();
    anonymousBlock.children = currentInlineContent;
    result.push(anonymousBlock);
  }

  return result;
}

/**
 * Processes children of an element and generates boxes
 */
function processChildren(
  parent: Element | Document,
  parentDisplayType: DisplayType | null,
  parentBoxType: BoxType | null
): BoxNode[] {
  const children: BoxNode[] = [];
  const parentBlockifies = parentDisplayType
    ? blockifiesChildren(parentDisplayType)
    : false;
  const parentIsBlockLevel = parentDisplayType
    ? isBlockLevel(parentDisplayType)
    : true;
  const parentEstablishesBFC = parentDisplayType
    ? establishesBlockFormattingContext(parentDisplayType)
    : false;

  // Collect all child nodes (elements and text)
  const childNodes: (Element | Text)[] = [];
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i];
    if (
      node.nodeType === Node.ELEMENT_NODE ||
      node.nodeType === Node.TEXT_NODE
    ) {
      childNodes.push(node as Element | Text);
    }
  }

  // Process nodes sequentially
  let i = 0;
  while (i < childNodes.length) {
    const node = childNodes[i];

    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const text = textNode.textContent || '';

      // Skip whitespace-only text nodes between block elements
      if (isWhitespaceOnly(text) && parentIsBlockLevel) {
        i++;
        continue;
      }

      // Create appropriate anonymous box for text
      // If parent blockifies (flex/grid), text nodes become anonymous flex/grid items
      if (text.trim().length > 0) {
        if (parentBlockifies && parentDisplayType) {
          const parentIsGrid =
            parentDisplayType === 'grid' || parentDisplayType === 'inline-grid';
          children.push(
            parentIsGrid
              ? createAnonymousGridItem(text, textNode)
              : createAnonymousFlexItem(text, textNode)
          );
        } else {
          children.push(createAnonymousInlineBox(text, textNode));
        }
      }
      i++;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const displayType = getComputedDisplayType(element);

      // Skip if display: none
      if (!generatesBox(displayType)) {
        i++;
        continue;
      }

      // Handle display: contents - promote children
      if (isContents(displayType)) {
        const contentsChildren = processChildren(
          element,
          parentDisplayType,
          parentBoxType
        );
        children.push(...contentsChildren);
        i++;
        continue;
      }

      const elementIsInlineLevel = isInlineLevel(displayType);

      // CSS 2.1 Section 9.2.1.1: Block-in-Inline Splitting
      // When an inline box contains a block-level box, the inline box is split.
      // HOWEVER: If the inline element itself establishes a BFC (like inline-block),
      // it can contain block children without splitting!
      const hasBlockChildren = hasBlockLevelChildren(element);
      const elementEstablishesBFC =
        establishesBlockFormattingContext(displayType);

      if (
        elementIsInlineLevel &&
        !parentEstablishesBFC &&
        hasBlockChildren &&
        !elementEstablishesBFC
      ) {
        // This inline element contains block-level children - it must be split
        // Process its children and return them directly (promoting them to this level)
        const splitBoxes = processInlineWithBlockChildren(
          element,
          displayType,
          parentBlockifies
        );
        children.push(...splitBoxes);
        i++;
        continue;
      }

      // Normal case: create box for element
      const box = createBoxFromElement(
        element,
        displayType,
        parentBlockifies,
        parentDisplayType
      );
      box.children = processChildren(element, displayType, box.boxType);
      children.push(box);
      i++;
    } else {
      i++;
    }
  }

  // Post-process: wrap inline content in anonymous block boxes if needed
  // According to CSS spec: If a block container box has a block-level box inside it,
  // then we force it to have only block-level boxes inside it.
  // This means if there are any block-level children, all inline-level children
  // must be wrapped in anonymous block boxes.
  const isParentBlockContainer = parentDisplayType
    ? isBlockContainer(parentDisplayType)
    : false;

  if (isParentBlockContainer && !parentBlockifies) {
    // Check if there are any block-level children
    const hasBlockLevelChildren = children.some((child) => {
      const isBlock =
        child.boxType === 'block' ||
        child.boxType === 'flex-container' ||
        child.boxType === 'grid-container' ||
        child.boxType === 'list-item' ||
        child.boxType === 'anonymous-block';
      return isBlock;
    });

    // If there are block-level children, wrap inline children in anonymous blocks
    if (hasBlockLevelChildren) {
      return wrapInlineInAnonymousBlocks(children);
    }
  }

  return children;
}

/**
 * Wraps consecutive inline boxes in anonymous block boxes
 * when they are siblings with block boxes
 */
function wrapInlineInAnonymousBlocks(children: BoxNode[]): BoxNode[] {
  const result: BoxNode[] = [];
  let currentAnonymousBlock: BoxNode | null = null;

  for (const child of children) {
    const isInline =
      child.boxType === 'inline' ||
      child.boxType === 'inline-block' ||
      child.boxType === 'anonymous-inline';
    const isBlock =
      child.boxType === 'block' ||
      child.boxType === 'flex-container' ||
      child.boxType === 'grid-container' ||
      child.boxType === 'list-item';

    if (isInline) {
      // Start new anonymous block if needed
      if (!currentAnonymousBlock) {
        currentAnonymousBlock = createAnonymousBlockBox();
      }
      currentAnonymousBlock.children.push(child);
    } else if (isBlock) {
      // Close current anonymous block if exists
      if (currentAnonymousBlock) {
        result.push(currentAnonymousBlock);
        currentAnonymousBlock = null;
      }
      result.push(child);
    } else {
      // Other types (flex-item, grid-item, etc.)
      if (currentAnonymousBlock) {
        result.push(currentAnonymousBlock);
        currentAnonymousBlock = null;
      }
      result.push(child);
    }
  }

  // Close any remaining anonymous block
  if (currentAnonymousBlock) {
    result.push(currentAnonymousBlock);
  }

  return result;
}

/**
 * Builds element-to-box mapping for hover synchronization
 */
function buildElementMap(node: BoxNode, elementMap: ElementToBoxMap): void {
  if (node.element) {
    if (!elementMap.elementToBoxId.has(node.element)) {
      elementMap.elementToBoxId.set(node.element, node.id);
    }
    if (!elementMap.boxIdToElements.has(node.id)) {
      elementMap.boxIdToElements.set(node.id, []);
    }
    elementMap.boxIdToElements.get(node.id)!.push(node.element);

    // Add data attribute to element for iframe matching
    node.element.setAttribute('data-box-id', node.id);
  }

  if (node.textNode) {
    if (!elementMap.elementToBoxId.has(node.textNode)) {
      elementMap.elementToBoxId.set(node.textNode, node.id);
    }
    if (!elementMap.boxIdToElements.has(node.id)) {
      elementMap.boxIdToElements.set(node.id, []);
    }
    elementMap.boxIdToElements.get(node.id)!.push(node.textNode);
  }

  for (const child of node.children) {
    buildElementMap(child, elementMap);
  }
}

/**
 * Generates the box tree from HTML string
 */
export function generateBoxTree(html: string): {
  tree: BoxNode | null;
  elementMap: ElementToBoxMap;
} {
  nodeIdCounter = 0;
  const elementMap: ElementToBoxMap = {
    elementToBoxId: new Map(),
    boxIdToElements: new Map(),
  };

  try {
    const doc = parseHTML(html);
    const body = getBodyElement(doc);

    if (!body) {
      return { tree: null, elementMap };
    }

    let root: BoxNode | null = null;

    // If body has only one child element, return that element's box tree directly
    // This avoids showing the redundant body wrapper for cleaner visualization
    const bodyElementChildren = Array.from(body.children).filter(
      (el) => el.nodeType === Node.ELEMENT_NODE
    );

    // Check if there are any non-whitespace text nodes
    const hasNonWhitespaceText = Array.from(body.childNodes).some(
      (node) =>
        node.nodeType === Node.TEXT_NODE &&
        node.textContent &&
        node.textContent.trim().length > 0
    );

    if (bodyElementChildren.length === 1 && !hasNonWhitespaceText) {
      const singleChild = bodyElementChildren[0] as Element;
      const displayType = getComputedDisplayType(singleChild);

      if (!generatesBox(displayType)) {
        return { tree: null, elementMap };
      }

      // Check if this single child is an inline element with block-level children
      // If so, it will be split and we need to show body as root with multiple children
      // BUT: inline elements that establish BFC (like inline-block) don't split
      const isInline = isInlineLevel(displayType);
      const childEstablishesBFC =
        establishesBlockFormattingContext(displayType);
      const needsSplitting =
        isInline && !childEstablishesBFC && hasBlockLevelChildren(singleChild);

      if (needsSplitting) {
        // Don't create a box for the inline element - it will be split
        // Show body as root with the split boxes as children
        root = {
          id: generateId(),
          boxType: 'block',
          displayType: 'block',
          element: body,
          textContent: null,
          tagName: 'body',
          className: null,
          style: null,
          children: [],
          isAnonymous: false,
          isEmpty: false,
        };
        root.children = processChildren(body, 'block', 'block');
      } else {
        // Normal case: create box for the single child element
        root = createBoxFromElement(singleChild, displayType, false, null);
        root.children = processChildren(singleChild, displayType, root.boxType);
      }
    } else {
      // Multiple children or mixed content: show body as root
      // Create root box (block container for body)
      root = {
        id: generateId(),
        boxType: 'block',
        displayType: 'block',
        element: body,
        textContent: null,
        tagName: 'body',
        className: null,
        style: null,
        children: [],
        isAnonymous: false,
        isEmpty: false,
      };

      // Process body's children
      root.children = processChildren(body, 'block', 'block');
    }

    // Build element mapping
    if (root) {
      buildElementMap(root, elementMap);
    }

    return { tree: root, elementMap };
  } catch (error) {
    console.error('Error generating box tree:', error);
    return { tree: null, elementMap };
  }
}
