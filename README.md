# CSS Box Tree Visualizer

A React TypeScript tool for visualizing how browsers generate CSS box trees from HTML/CSS, based on the [W3C CSS Display Module Level 3](https://www.w3.org/TR/css-display-3/) specification.

## Features

- **Interactive Box Tree Visualization**: See how HTML elements are converted into CSS boxes
- **12 Educational Examples**: Explore different scenarios including anonymous boxes, forbidden nesting, flex/grid containers, and more
- **Synchronized Hover Highlighting**: Hover over tree nodes to see corresponding elements in the HTML preview
- **Live HTML Editor**: Edit HTML with syntax highlighting using CodeMirror
- **Dark Theme**: Beautiful dark theme inspired by RSC Explorer

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Examples

The tool includes 12 educational examples:

1. **Basic Anonymous Box Wrapping** - Shows how inline and block siblings trigger anonymous blocks
2. **Block Inside Inline** - Demonstrates forbidden nesting behavior
3. **Pure Inline Flow** - No anonymous boxes when all children are inline
4. **display: inline-block** - Inline-level box with block formatting context
5. **display: none vs contents** - Removal vs box-only removal
6. **Flexbox Container** - Children are blockified into flex items
7. **Grid Container** - Children become grid items
8. **Deeply Nested Structure** - Real-world article/header/section hierarchy
9. **List Items** - Principal box + marker box generation
10. **Whitespace Handling** - Whitespace between blocks is collapsed
11. **Empty Elements** - Empty elements still generate boxes
12. **Inline Formatting with BR** - Line breaks in inline formatting context

## Architecture

The application consists of:

- **Core Engine**: Box tree generation algorithm that implements CSS Display Module Level 3 rules
- **Style Resolver**: Parses inline CSS styles and determines display types
- **UI Components**: Three-panel layout with editor, tree view, and HTML preview
- **Hover Synchronization**: Cross-panel highlighting when hovering over tree nodes

## Tech Stack

- React 18
- TypeScript
- Vite
- CodeMirror 6
- CSS Display Module Level 3 specification

## License

MIT

