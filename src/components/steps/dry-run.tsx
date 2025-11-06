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
import type { PlanItem } from '@/types/media';
import { Planner } from '@/features/planner';

export default function DryRun() {
  const { plan, setCurrentStep, options, setPlan } = useAppStore();

  const handleRetry = async (item: PlanItem) => {
    const planner = new Planner(options);
    const newPlan = await planner.reprocessFile(item);
    setPlan(newPlan);
  };

  if (!plan) {
    return (
      <Card className="w-full max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Dry-Run Report</CardTitle>
          <CardDescription>No plan has been generated yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Go back to the options step and generate a plan first.</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => setCurrentStep(1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Options
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const handleExportJson = () => {
    const json = exportJson(plan);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'media-organizer-plan.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const csv = exportCsv(plan);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'media-organizer-plan.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = {
    ok: plan.items.filter(item => item.status === 'success').length,
    skipped: plan.items.filter(item => item.status === 'skipped').length,
    errors: plan.items.filter(item => item.status === 'error').length,
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Dry-Run Report</CardTitle>
            <CardDescription>
              Scanned {plan.items.length} files: {summary.ok} OK, {summary.skipped} skipped, {summary.errors} errors.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportJson}><Download className="mr-2 h-4 w-4" /> JSON</Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}><Download className="mr-2 h-4 w-4" /> CSV</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Date (source)</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Error Code</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.items.map((item: PlanItem, index: number) => (
                <TableRow key={index}>
                  <TableCell><Badge variant={item.action === 'copy' ? 'secondary' : 'default'}>{item.action}</Badge></TableCell>
                  <TableCell><Badge variant={item.status === 'success' ? 'default' : item.status === 'skipped' ? 'secondary' : 'destructive'}>{item.status}</Badge></TableCell>
                  <TableCell className="font-code">{item.file.ref.srcPath}</TableCell>
                  <TableCell className="font-code">{item.destRelPath}</TableCell>
                  <TableCell>{item.file.meta.detectedDate?.date} ({item.file.meta.detectedDate?.source})</TableCell>
                  <TableCell>{item.reason}</TableCell>
                  <TableCell>{item.error?.code}</TableCell>
                  <TableCell>{item.error?.message}</TableCell>
                  <TableCell>
                    {item.status === 'error' && (
                      <Button variant="outline" size="sm" onClick={() => handleRetry(item)}>Retry</Button>
                    )}
                  </TableCell>
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