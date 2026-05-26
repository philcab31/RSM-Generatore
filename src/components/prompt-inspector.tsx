"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Copy, ChevronDown, ChevronUp, Terminal } from "lucide-react";
import type { PromptTrace } from "@/lib/ai/provider-manager";

interface PromptInspectorProps {
  trace: PromptTrace | undefined;
  title?: string;
}

function StepBlock({
  step,
  isOpen,
  onToggle,
}: {
  step: PromptTrace["steps"][number];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const hasContent = step.systemPrompt || step.userPrompt || step.assembledPrompt || step.output;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="shrink-0 min-w-[2rem] justify-center">
            {step.step}
          </Badge>
          <div>
            <div className="font-medium text-sm">{step.name}</div>
            {step.description && (
              <div className="text-xs text-muted-foreground mt-0.5">{step.description}</div>
            )}
          </div>
        </div>
        {hasContent && (
          isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {isOpen && hasContent && (
        <div className="px-3 pb-3 space-y-3">
          <Separator />

          {step.systemPrompt && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                  System Prompt (injecté automatiquement)
                </span>
                <CopyButton text={step.systemPrompt} />
              </div>
              <pre className="rounded-md bg-emerald-950/10 p-2.5 text-xs text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap break-words font-mono leading-relaxed">
                {step.systemPrompt}
              </pre>
            </div>
          )}

          {step.userPrompt && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  User Prompt
                </span>
                <CopyButton text={step.userPrompt} />
              </div>
              <pre className="rounded-md bg-blue-950/10 p-2.5 text-xs text-blue-900 dark:text-blue-100 whitespace-pre-wrap break-words font-mono leading-relaxed">
                {step.userPrompt}
              </pre>
            </div>
          )}

          {step.assembledPrompt && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                  Prompt assemblé (envoyé au LLM)
                </span>
                <CopyButton text={step.assembledPrompt} />
              </div>
              <pre className="rounded-md bg-amber-950/10 p-2.5 text-xs text-amber-900 dark:text-amber-100 whitespace-pre-wrap break-words font-mono leading-relaxed">
                {step.assembledPrompt}
              </pre>
            </div>
          )}

          {step.output && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                  Réponse du modèle
                </span>
                <CopyButton text={step.output} />
              </div>
              <pre className="rounded-md bg-purple-950/10 p-2.5 text-xs text-purple-900 dark:text-purple-100 whitespace-pre-wrap break-words font-mono leading-relaxed">
                {step.output}
              </pre>
            </div>
          )}

          {step.metadata && Object.keys(step.metadata).length > 0 && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Métadonnées
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {Object.entries(step.metadata).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-[10px]">
                    {key}: {String(value)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-6 w-6"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <span className="text-[10px] font-bold text-green-600">OK</span>
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}

export function PromptInspector({ trace, title = "Inspecteur de prompts" }: PromptInspectorProps) {
  const [open, setOpen] = useState(false);
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({});

  if (!trace || trace.steps.length === 0) return null;

  const toggleStep = (stepNum: number) => {
    setOpenSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    trace.steps.forEach((s) => (all[s.step] = true));
    setOpenSteps(all);
  };

  const collapseAll = () => setOpenSteps({});

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {trace.steps.length} étape{trace.steps.length > 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={expandAll}>
              Tout déplier
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={collapseAll}>
              Tout replier
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setOpen(!open)}
            >
              {open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-0">
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-2">
              {trace.steps.map((step, index) => (
                <StepBlock
                  key={`${step.step}-${index}`}
                  step={step}
                  isOpen={!!openSteps[step.step]}
                  onToggle={() => toggleStep(step.step)}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
