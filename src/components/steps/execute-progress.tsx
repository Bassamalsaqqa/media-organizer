'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/store/app-store';
import { CheckCircle, Home } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { executePlan } from '@/features/execute';
import { getFsClient } from '@/features/fs/adapters';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const fsClient = getFsClient();

export default function ExecuteProgress() {
  const { plan, options, progress, setProgress, addLog, logs, reset, setCurrentStep } = useAppStore();
  const [isExecuting, setIsExecuting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const startExecution = async () => {
    if (!plan) {
      toast({
        variant: "destructive",
        title: "Execution Error",
        description: "No plan available to execute.",
      });
      return;
    }
    setIsExecuting(true);
    setIsComplete(false);
    try {
      await executePlan(fsClient, plan, options, (p) => {
        setProgress(p);
        addLog(p.message);
      });
      setIsComplete(true);
    } catch(e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Execution Failed",
        description: errorMessage,
      });
      addLog(`ERROR: ${errorMessage}`);
    } finally {
      setIsExecuting(false);
    }
  };
  
  const handleReset = () => {
    reset();
    setCurrentStep(0);
  }

  const progressValue = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Execute Plan</CardTitle>
        <CardDescription>
          This will move and organize your files. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isComplete ? (
          <>
            <div className="space-y-2">
                <Progress value={progressValue} />
                <p className="text-sm text-muted-foreground text-center font-code">
                    {progress.message || 'Ready to start...'}
                </p>
            </div>
            <ScrollArea className="h-48 w-full rounded-md border" ref={logContainerRef}>
                <div className="text-xs font-code space-y-1 p-2">
                    {logs.map((log, i) => <p key={i} className="break-all">{log}</p>)}
                </div>
            </ScrollArea>
          </>
        ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <h3 className="text-2xl font-semibold">Execution Complete!</h3>
                <p className="text-muted-foreground">Your media has been organized.</p>
            </div>
        )}
      </CardContent>
      <CardFooter>
        {isComplete ? (
            <Button onClick={handleReset} className="mx-auto">
                <Home className="mr-2 h-4 w-4" /> Start Over
            </Button>
        ) : (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button disabled={isExecuting} className="mx-auto">
                        {isExecuting ? 'Executing...' : 'Start Execution'}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will modify your files on disk and cannot be undone. 
                        It's recommended to have a backup of your source folder.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={startExecution}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
}
