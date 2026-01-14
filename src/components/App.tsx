import { useState, useMemo } from 'react';
import Editor from './Editor';
import BoxTreeView from './BoxTreeView';
import HtmlPreview from './HtmlPreview';
import { generateBoxTree } from '../core/boxTreeGenerator';
import { useHoverSync } from '../hooks/useHoverSync';
import { examples } from '../core/examples';

const DEFAULT_HTML = `<section>
  <span>Foo</span>
  <div>Bar</div>
  Baz
</section>`;

export default function App() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [selectedExample, setSelectedExample] = useState<string>('1');
  const { highlightedNodeId, handleHover } = useHoverSync();

  const handleExampleChange = (exampleId: string) => {
    const example = examples.find((e) => e.id === exampleId);
    if (example) {
      setHtml(example.html);
      setSelectedExample(exampleId);
    }
  };

  const { boxTree, elementMap } = useMemo(() => {
    try {
      const result = generateBoxTree(html);
      return {
        boxTree: result.tree,
        elementMap: result.elementMap
      };
    } catch (error) {
      console.error('Error in generateBoxTree:', error);
      return { 
        boxTree: null, 
        elementMap: { elementToBoxId: new Map(), boxIdToElements: new Map() } 
      };
    }
  }, [html]);

  return (
    <div className='app'>
      <header className='app-header'>
        <div className='header-content'>
          <div>
            <h1>CSS Box Tree Visualizer</h1>
            <p>Visualize how browsers generate CSS box trees from HTML</p>
          </div>
          <div className='examples-selector'>
            <label htmlFor='example-select'>Examples:</label>
            <select
              id='example-select'
              value={selectedExample}
              onChange={(e) => handleExampleChange(e.target.value)}
            >
              {examples.map((example) => (
                <option key={example.id} value={example.id}>
                  {example.name}
                </option>
              ))}
            </select>
            {examples.find((e) => e.id === selectedExample) && (
              <p className='example-description'>
                {examples.find((e) => e.id === selectedExample)?.description}
              </p>
            )}
          </div>
        </div>
      </header>
      <div className='app-content'>
        <div className='panel editor-panel'>
          <div className='panel-header'>
            <h2>HTML Input</h2>
          </div>
          <div className='panel-body'>
            <Editor
              value={html}
              onChange={setHtml}
              onHover={handleHover}
              highlightedNodeId={highlightedNodeId}
              elementMap={elementMap}
            />
          </div>
        </div>
        <div className='panel tree-panel'>
          <div className='panel-header'>
            <h2>Box Tree</h2>
          </div>
          <div className='panel-body'>
            <BoxTreeView
              boxTree={boxTree}
              onHover={handleHover}
              highlightedNodeId={highlightedNodeId}
            />
          </div>
        </div>
        <div className='panel preview-panel'>
          <div className='panel-header'>
            <h2>HTML Preview</h2>
          </div>
          <div className='panel-body'>
            <HtmlPreview
              html={html}
              boxTree={boxTree}
              highlightedNodeId={highlightedNodeId}
              onHover={handleHover}
              elementMap={elementMap}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
