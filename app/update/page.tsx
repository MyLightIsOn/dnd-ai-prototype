"use client";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Header from "@/components/header";
import ViewPort from "@/components/viewport";
import Pallette from "@/components/pallette";

export default function App() {
  return (
    <div className="p-4 bg-slate-50">
      <ReactFlowProvider>
        <div className="w-full h-[85vh] grid grid-cols-[260px_1fr_320px] grid-rows-[auto_1fr_auto] gap-4">
          <Header />
          <Pallette />

          <div className="row-span-2 bg-white border rounded-2xl overflow-hidden">
            <ViewPort />
          </div>
        </div>
      </ReactFlowProvider>
    </div>
  );
}
