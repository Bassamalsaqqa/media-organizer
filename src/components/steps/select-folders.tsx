'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/app-store';
import { FolderOpen, FolderOutput, ArrowRight } from 'lucide-react';
import { createFsClient } from '@/features/fs';
import { useToast } from '@/hooks/use-toast';

const fsClient = createFsClient();

export default function SelectFolders() {
  const { sourceHandle, destHandle, setSourceHandle, setDestHandle, nextStep } = useAppStore();
  const { toast } = useToast();

  const handleSelectSource = async () => {
    try {
      const handle = await fsClient.pickDirectory({ mode: 'read' });
      if (handle) {
        setSourceHandle(handle);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        toast({ title: 'Folder selection cancelled.', description: 'You can select a folder anytime.' });
      } else {
        toast({ variant: 'destructive', title: 'Error selecting folder', description: e instanceof Error ? e.message : String(e) });
      }
    }
  };

  const handleSelectDest = async () => {
    try {
      const handle = await fsClient.pickDirectory({ mode: 'readwrite' });
      if (handle) {
        setDestHandle(handle);
      } 
    } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
            toast({ title: 'Folder selection cancelled.', description: 'You can select a folder anytime.' });
        } else {
            toast({ variant: 'destructive', title: 'Error selecting folder', description: e instanceof Error ? e.message : String(e) });
        }
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Select Folders</CardTitle>
        <CardDescription>Choose your source media folder and a destination for organized files.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
          <FolderOpen className="w-8 h-8 text-primary shrink-0" />
          <div className="flex-grow min-w-0">
            <h3 className="font-semibold">Source Folder</h3>
            <p className="text-sm text-muted-foreground font-code truncate" title={sourceHandle?.name}>{sourceHandle?.name || 'No folder selected'}</p>
          </div>
          <Button onClick={handleSelectSource}>Select Source</Button>
        </div>
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
          <FolderOutput className="w-8 h-8 text-accent shrink-0" />
          <div className="flex-grow min-w-0">
            <h3 className="font-semibold">Destination Folder</h3>
            <p className="text-sm text-muted-foreground font-code truncate" title={destHandle?.name}>{destHandle?.name || 'No folder selected'}</p>
          </div>
          <Button onClick={handleSelectDest} variant="secondary">Select Destination</Button>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={nextStep} disabled={!sourceHandle || !destHandle} className="ml-auto">
          Next Step <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
