"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Workflow, Zap, GitBranch, RefreshCw } from "lucide-react";

const STORAGE_KEY = "welcome_seen_v1";

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
          <Workflow size={22} className="text-indigo-600" />
          Welcome to Multi-Agent Workflow Studio
        </DialogTitle>

        <p className="text-sm text-gray-600 leading-relaxed">
          A visual editor for designing and running multi-agent AI pipelines.
          Connect prompts, documents, LLM agents, routers, and loops to build
          powerful workflows — no code required.
        </p>

        <div className="grid grid-cols-2 gap-3 my-1">
          <div className="flex gap-2 items-start text-sm text-gray-700">
            <Zap size={16} className="text-indigo-500 mt-0.5 shrink-0" />
            <span>Run real LLM agents (OpenAI, Anthropic, Google) or use mock mode for free</span>
          </div>
          <div className="flex gap-2 items-start text-sm text-gray-700">
            <GitBranch size={16} className="text-indigo-500 mt-0.5 shrink-0" />
            <span>Route between branches based on keywords or AI judgment</span>
          </div>
          <div className="flex gap-2 items-start text-sm text-gray-700">
            <RefreshCw size={16} className="text-indigo-500 mt-0.5 shrink-0" />
            <span>Build iterative loops that refine output until a condition is met</span>
          </div>
          <div className="flex gap-2 items-start text-sm text-gray-700">
            <Workflow size={16} className="text-indigo-500 mt-0.5 shrink-0" />
            <span>Run agents in parallel and synthesize results automatically</span>
          </div>
        </div>

        <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-800">
          <span className="font-medium">Get started:</span> click the{" "}
          <span className="font-medium">Samples</span> button in the toolbar to
          load a pre-built workflow, then hit <span className="font-medium">Run</span> to see it in action.
        </div>

        <Button onClick={dismiss} className="w-full bg-indigo-600 text-white mt-1">
          Get Started
        </Button>
      </DialogContent>
    </Dialog>
  );
}
