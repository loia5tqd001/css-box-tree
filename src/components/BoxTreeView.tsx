import { BoxNode } from '../core/types';
import TreeNode from './TreeNode';

interface BoxTreeViewProps {
  boxTree: BoxNode | null;
  onHover?: (nodeId: string | null) => void;
  highlightedNodeId?: string | null;
}

export default function BoxTreeView({
  boxTree,
  onHover,
  highlightedNodeId,
}: BoxTreeViewProps) {
  if (!boxTree) {
    return (
      <div className='box-tree-view empty'>
        <p>No box tree generated. Enter HTML to visualize.</p>
      </div>
    );
  }

  return (
    <div className='box-tree-view'>
      <div className='box-tree-content'>
        <TreeNode
          node={boxTree}
          onHover={onHover}
          highlightedNodeId={highlightedNodeId}
        />
      </div>
    </div>
  );
}
