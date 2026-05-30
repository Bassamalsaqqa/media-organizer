'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/app-store';
import { Home, Copy, Download, Terminal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportJson } from '@/features/report';

export default function ExecuteProgress() {
  const { plan, reset, setCurrentStep } = useAppStore();
  const { toast } = useToast();

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

  const cliCommand = `cd media-organizer-cli
npm install
npm run build
node dist/execute-plan.js ^
  --plan "..\\media-organizer-plan.json" ^
  --execute --verify --resume --concurrency 4 ^
  --source-root "C:\\FULL\\PATH\\TO\\SOURCE" ^
  --dest-root   "D:\\FULL\\PATH\\TO\\DESTINATION"`;

  const handleCopyCliCommand = () => {
    navigator.clipboard.writeText(cliCommand);
    toast({ title: 'CLI command copied to clipboard.' });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Execute Plan</CardTitle>
        <CardDescription>
          Use the CLI for final copying so file bytes and filesystem timestamps are preserved.
          <p className="text-sm text-yellow-500 mt-2">
            The browser execution path is disabled because browsers cannot preserve Windows Created/Modified timestamps.
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border p-4">
          <Terminal className="mt-1 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-2">
            <h3 className="font-semibold">Run with timestamp-preserving CLI</h3>
            <p className="text-sm text-muted-foreground">
              Download the plan, place it where the command references it, then replace the source and destination roots with absolute paths.
            </p>
          </div>
        </div>

        <div className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-left font-code text-sm overflow-x-auto">
          <pre><code>{cliCommand}</code></pre>
        </div>

        <div className="flex gap-2 justify-center">
          <Button onClick={handleDownloadPlan} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Download Plan
          </Button>
          <Button onClick={handleCopyCliCommand} variant="outline">
            <Copy className="mr-2 h-4 w-4" /> Copy Command
          </Button>
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
