'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/store/app-store';
import { ArrowLeft, ArrowRight, Download } from 'lucide-react';
import { exportCsv, exportJson } from '@/features/report';

export default function DryRun() {
  const { plan, setCurrentStep } = useAppStore();

  if (!plan) {
    return (
      <Card className="w-full max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>No Plan Generated</CardTitle>
          <CardDescription>Something went wrong. Please go back and try again.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={() => setCurrentStep(1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Options
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const handleExport = (format: 'json' | 'csv') => {
    const content = format === 'json' ? exportJson(plan) : exportCsv(plan);
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `media-organizer-plan.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
        case 'move': return 'default';
        case 'copy': return 'secondary';
        case 'skip': return 'outline';
        default: return 'default';
    }
  }

  return (
    <Card className="w-full max-w-5xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Dry-Run Preview</CardTitle>
        <CardDescription>
          Review the changes that will be made. No files will be moved yet. Found {plan.stats.totalFiles} files.
          ({plan.stats.toMove} to move, {plan.stats.toCopy} to copy, {plan.stats.skipped} to skip).
        </CardDescription>
        <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
                <Download className="mr-2 h-4 w-4" /> Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96 w-full rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50">
              <TableRow>
                <TableHead className="w-[100px]">Action</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="w-[120px]">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.actions.map((action, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Badge variant={getBadgeVariant(action.type)}>{action.type.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="font-code text-xs truncate max-w-xs" title={action.source}>{action.source}</TableCell>
                  <TableCell className="font-code text-xs truncate max-w-xs" title={action.destination}>{action.destination}</TableCell>
                  <TableCell>{action.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={() => setCurrentStep(3)}>
          Execute Plan <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
