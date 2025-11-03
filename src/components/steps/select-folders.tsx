'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/app-store';
import { FolderOpen, FolderOutput, ArrowRight } from 'lucide-react';
import { getFsClient } from '@/features/fs/adapters/browser-fs-adapter';
import { useToast } from '@/hooks/use-toast';
import type { MediaFile } from '@/types/media';

const fsClient = getFsClient();

export default function SelectFolders() {
  const { sourceHandle, destHandle, setSourceHandle, setDestHandle, setCurrentStep, setFiles } = useAppStore();
  const { toast } = useToast();

  const handleSelectSource = async () => {
    const handle = await fsClient.pickDirectory({ mode: 'readwrite' });
    if (handle) {
      setSourceHandle(handle);
      scanFiles(handle);
    }
  };

  const handleSelectDest = async () => {
    const handle = await fsClient.pickDirectory({ mode: 'readwrite' });
    if (handle) {
      setDestHandle(handle);
    }
  };
  
  const scanFiles = async (handle: FileSystemDirectoryHandle) => {
    try {
        const files: MediaFile[] = [];
        toast({
            title: "Scanning folder...",
            description: "This may take a moment for large directories.",
        });
        for await (const fileHandle of fsClient.walkRecursive(handle)) {
            // A simple filter for media files, can be improved.
            if (fileHandle.name.match(/\.(jpg|jpeg|png|gif|mov|mp4|mkv|avi|webp)$/i)) {
                const file = await fileHandle.getFile();
                
                let relativePath = fileHandle.name;
                try {
                  const pathParts = await handle.resolve(fileHandle);
                  if(pathParts) {
                    relativePath = pathParts.join('/');
                  }
                } catch (e) {
                  // resolve() is not supported in all browsers, fallback to name
                  console.warn("Could not resolve file path, falling back to name.", e)
                }
                
                files.push({
                    id: `${file.name}-${file.lastModified}`,
                    name: file.name,
                    path: relativePath,
                    handle: fileHandle,
                    size: file.size,
                    type: file.type,
                });
            }
        }
        setFiles(files);
        toast({
            title: "Scan complete",
            description: `Found ${files.length} media files.`,
        });
    } catch(e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        toast({
            variant: "destructive",
            title: "Error scanning files",
            description: `Could not read files. ${errorMessage}`,
        });
    }
  }

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
        <Button onClick={() => setCurrentStep(1)} disabled={!sourceHandle || !destHandle} className="ml-auto">
          Next Step <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
