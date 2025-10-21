import type { Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import React from "react";
import type { TypedNode } from "@/types";

export async function importJSON({
  e,
  setNodes,
  setEdges,
}: {
  e: React.ChangeEvent<HTMLInputElement>;
  setNodes: React.Dispatch<React.SetStateAction<TypedNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = JSON.parse(text) as {
        nodes?: TypedNode[];
        edges?: Edge[];
      };
      setNodes(parsed.nodes || []);
      setEdges(
        (parsed.edges || []).map((ed) => ({
          ...ed,
          markerEnd: { type: MarkerType.ArrowClosed },
        })),
      );
    } catch (err) {
      console.log(err);
      alert("Invalid JSON");
    }
  };
  reader.readAsText(file);
}
