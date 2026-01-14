export interface Example {
  id: string;
  name: string;
  description: string;
  html: string;
}

export const examples: Example[] = [
  {
    id: '1',
    name: 'Basic Anonymous Box Wrapping',
    description:
      'When inline and block content are siblings, inline content gets wrapped in anonymous block boxes.',
    html: `<section>
  <span>Foo</span>
  <div>Bar</div>
  Baz
</section>`,
  },
  {
    id: '2',
    name: 'Block Inside Inline (Forbidden Nesting)',
    description:
      'A block element inside an inline element causes the inline to be "split" - creating anonymous block boxes.',
    html: `<span>
  Before
  <div>Block inside span!</div>
  After
</span>`,
  },
  {
    id: '2b',
    name: 'Nested Inline with Block (Cascading Split)',
    description:
      'When a nested inline contains a block, both the inner AND outer inline elements are split around the block.',
    html: `<span>
  First
  <span>
    Before
    <div>Block inside span!</div>
    After
  </span>
</span>`,
  },
  {
    id: '3',
    name: 'Pure Inline Flow',
    description:
      'When all children are inline, no anonymous block boxes are created.',
    html: `<p>
  Hello <strong>world</strong>, how <em>are</em> you?
</p>`,
  },
  {
    id: '4',
    name: 'display: inline-block',
    description:
      'inline-block creates an inline-level box that establishes a block formatting context inside.',
    html: `<p>
  Text before
  <span style="display: inline-block">
    <div>Nested block</div>
  </span>
  Text after
</p>`,
  },
  {
    id: '5',
    name: 'display: none vs display: contents',
    description:
      "none removes element and children from box tree. contents removes only the element's box but keeps children.",
    html: `<div>
  <span style="display: none">I'm invisible</span>
  <span style="display: contents"><em>I'm promoted!</em></span>
  <span>I'm normal</span>
</div>`,
  },
  {
    id: '6',
    name: 'Flexbox Container',
    description:
      'Flex containers blockify their children - all direct children become block-level flex items.',
    html: `<div style="display: flex; justify-content: space-between">
  <span>Flex item 1</span>
  <span>Flex item 2</span>
  Text becomes flex item too
</div>`,
  },
  {
    id: '7',
    name: 'Grid Container',
    description:
      'Similar to flex, grid containers blockify children into grid items.',
    html: `<div style="display: grid">
  <span>Grid item 1</span>
  <div>Grid item 2</div>
</div>`,
  },
  {
    id: '8',
    name: 'Deeply Nested Structure',
    description:
      'Shows how box tree mirrors DOM nesting with proper box types at each level.',
    html: `<article>
  <header>
    <h1>Title</h1>
    <p>Subtitle with <a href="#">link</a></p>
  </header>
  <section>
    <p>Content</p>
  </section>
</article>`,
  },
  {
    id: '9',
    name: 'List Items',
    description: 'list-item generates a principal block box plus a marker box.',
    html: `<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>`,
  },
  {
    id: '10',
    name: 'Whitespace Handling',
    description:
      'Whitespace-only text nodes between block elements are typically collapsed/ignored.',
    html: `<div>
  
  <p>First</p>
  
  <p>Second</p>
  
</div>`,
  },
  {
    id: '11',
    name: 'Empty Elements',
    description: 'Empty elements still generate boxes (unless display: none).',
    html: `<div>
  <span></span>
  <div></div>
  <p>Content</p>
</div>`,
  },
  {
    id: '12',
    name: 'Inline Formatting with BR',
    description:
      '<br> creates a forced line break within inline formatting context.',
    html: `<p>
  Line one<br>
  Line two<br>
  <strong>Line three</strong>
</p>`,
  },
];
