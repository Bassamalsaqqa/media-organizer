'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/store/app-store';
import { CheckCircle, Home, Copy, Download, Play, Pause, XCircle } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { Executor, ExecuteState, Progress as ExecutionProgress } from '@/features/execute';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { exportJson } from '@/features/report';
import { loadCheckpoint } from '@/features/resume/indexeddb';
import { generatePlanId } from '@/features/plan/plan-id';

export default function ExecuteProgress() {
  const { plan, sourceHandle, destHandle, reset, setCurrentStep, progress, setProgress } = useAppStore();
  const [executor, setExecutor] = useState<Executor | null>(null);
  const [state, setState] = useState<ExecuteState>('idle');
  const { toast } = useToast();

  useEffect(() => {
    const setupExecutor = async () => {
      if (plan && sourceHandle && destHandle) {
        const planId = await generatePlanId(plan);
        const exec = new Executor(plan, planId, sourceHandle, destHandle, setProgress);
        setExecutor(exec);

        // Check for checkpoint
        const checkpoint = await loadCheckpoint(planId);
        if (checkpoint) {
          // Pre-fill the progress bar from the checkpoint data
          setProgress({
            current: checkpoint.completedIds.length,
            total: plan.items.length,
            bytesCopied: checkpoint.bytesCopied,
            errors: [], // Errors are not persisted in checkpoints
          });
          toast({
            title: 'Resume previous run?',
            description: `Found a checkpoint with ${checkpoint.completedIds.length} completed files.`,
            action: (
              <Button onClick={() => {
                exec.resume();
                setState('running');
              }}>Resume</Button>
            ),
          });
        }
      }
    };

    setupExecutor();
  }, [plan, sourceHandle, destHandle, toast, setProgress]);

  const handleStart = () => {
    executor?.start();
    setState('running');
  };

  const handlePause = () => {
    executor?.pause();
    setState('paused');
  };

  const handleResume = () => {
    executor?.resume();
    setState('running');
  };

  const handleReset = () => {
    reset();
    setCurrentStep(0);
  };

  const handleDownloadPlan = () => {
    if (!plan) return;
    const json = exportJson(plan);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'media-organizer-plan.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCliCommand = () => {
    if (!sourceHandle || !destHandle) return;
    const concurrency = Math.max(2, Math.min(navigator.hardwareConcurrency / 2, 8));
    const cliCommand = `media-organizer-cli --plan "./media-organizer-plan.json" --execute --verify --resume --concurrency ${concurrency} --source-root "${sourceHandle.name}" --dest-root "${destHandle.name}"`;
    navigator.clipboard.writeText(cliCommand);
    toast({ title: 'CLI command copied to clipboard!' });
  };

  const progressValue = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Execute Plan</CardTitle>
        <CardDescription>
          Run the organization plan in the browser or via the CLI.
          <p className="text-sm text-yellow-500 mt-2">This tool never deletes source files. Review results and delete manually after confirming.</p>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state === 'finished' ? (
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h3 className="text-2xl font-semibold">Execution Complete!</h3>
            <p className="text-muted-foreground">Your media has been organized.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Progress value={progressValue} />
              <p className="text-sm text-muted-foreground text-center font-code">
                {progress.current} / {progress.total} files copied
              </p>
            </div>
            <ScrollArea className="h-48 w-full rounded-md border">
              <div className="text-xs font-code space-y-1 p-2">
                {progress.errors.map((err, i) => <p key={i} className="break-all text-red-500">[{err.code}] {err.file}: {err.message}</p>)}
              </div>
            </ScrollArea>
          </>
        )}

        <div className="flex justify-center gap-2">
          {state === 'idle' && (
            <Button onClick={handleStart}><Play className="mr-2 h-4 w-4" /> Run in Browser</Button>
          )}
          {state === 'running' && (
            <Button onClick={handlePause} variant="outline"><Pause className="mr-2 h-4 w-4" /> Pause</Button>
          )}
          {state === 'paused' && (
            <Button onClick={handleResume}><Play className="mr-2 h-4 w-4" /> Resume</Button>
          )}
        </div>

        <div className="pt-4">
            <h3 className="text-lg font-semibold text-center mb-2">Alternative: Run with CLI</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              To run the CLI, navigate to the `media-organizer-cli` directory in your terminal.
            </p>
            <div className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-left font-code text-sm overflow-x-auto">
              <pre><code>{`cd media-organizer-cli
npm install
npm run build
node dist/execute-plan.js ^
  --plan "./media-organizer-plan.json" ^
  --execute --verify --resume --concurrency 4 ^
  --source-root "${sourceHandle?.name || 'path/to/source'}" ^
  --dest-root   "${destHandle?.name || 'path/to/dest'}"`}</code></pre>
            </div>
            <div className="flex gap-2 mt-2 justify-center">
              <Button onClick={handleDownloadPlan} variant="outline"><Download className="mr-2 h-4 w-4" /> Download Plan</Button>
              <Button onClick={handleCopyCliCommand} variant="outline"><Copy className="mr-2 h-4 w-4" /> Copy Command</Button>
            </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleReset} className="mx-auto" variant="secondary">
          <Home className="mr-2 h-4 w-4" /> Start Over
        </Button>
      </CardFooter>
    </Card>
  );
}
