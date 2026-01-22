import { useCallback } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  MarkerType,
} from "@xyflow/react";
import type {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  OnSelectionChangeParams,
  NodeTypes,
} from "@xyflow/react";

import React from "react";
import { nodeTypes } from "@/components/nodes";
import type { TypedNode } from "@/types";

function ViewPort({
  nodes,
  setNodes,
  edges,
  setEdges,
  onSelectionChange,
}: {
  nodes: TypedNode[];
  setNodes: React.Dispatch<React.SetStateAction<TypedNode[]>>;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onSelectionChange?: (params: OnSelectionChangeParams) => void;
}) {
  const rf = useReactFlow();

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nodesSnapshot) =>
        applyNodeChanges(changes, nodesSnapshot as Node[]) as TypedNode[]
      ),
    [setNodes],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [setEdges],
  );
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((edgesSnapshot) =>
        addEdge(
          { ...params, markerEnd: { type: MarkerType.ArrowClosed } },
          edgesSnapshot,
        ),
      ),
    [setEdges],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const bounds = (
        event.currentTarget as HTMLDivElement
      ).getBoundingClientRect();
      const data = event.dataTransfer.getData("application/reactflow");
      if (!data) return;
      const { type, meta } = JSON.parse(data) as {
        type: "agent" | "tool" | "result";
        meta?: string | object | null | undefined;
      };
      const position = rf.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const label =
        type === "agent"
          ? `Agent ${nodes.filter((n) => n.type === "agent").length + 1}`
          : type === "tool"
            ? `Tool ${nodes.filter((n) => n.type === "tool").length + 1}`
            : `Output`;
      const newNode: Node = {
        id,
        type,
        position,
        data: meta || { name: label },
      } as Node;
      setNodes((nds) => nds.concat(newNode));
    },
    [nodes, rf, setNodes],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div className={"w-full h-full"}>
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes as NodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background gap={16} />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default ViewPort;
