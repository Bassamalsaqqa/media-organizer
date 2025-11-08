'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAppStore } from '@/store/app-store';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createFsClient } from '@/features/fs';
import { Planner } from '@/features/planner';

const fsClient = createFsClient();

export default function SetOptions() {
  const { options, setLayout, setDuplicateAction, setEnableNearDuplicate, setCurrentStep, sourceHandle, setPlan, setPlanner, setDetectDuplicates } = useAppStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (!sourceHandle) {
      toast({
        variant: "destructive",
        title: "No source folder selected",
        description: "Go back and select a source folder.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { id } = toast({ title: 'Scanning files...', description: 'Starting to build plan.' });
      const planner = new Planner(options);
      setPlanner(planner);

      const onProgress = ({ processed }: { processed: number }) => {
        toast({
          id,
          title: 'Scanning files...',
          description: `${processed} files analyzed.`,
        });
      };

      const plan = await planner.generatePlan(sourceHandle, onProgress);
      setPlan(plan);

      toast({ id, title: 'Dry-run ready!', description: `Plan generated for ${plan.items.length} files.` });
      setCurrentStep(2);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Error generating dry-run",
        description: errorMessage,
      });
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Organization Options</CardTitle>
        <CardDescription>Define how you want your media to be organized.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Destination Layout</Label>
          <RadioGroup
            value={options.layout}
            onValueChange={(value) => setLayout(value as 'kind-then-date' | 'date-only')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="kind-then-date" id="kind-then-date" />
              <Label htmlFor="kind-then-date" className="cursor-pointer">By kind then date</Label>
              <p className="text-sm text-muted-foreground">e.g. photo/2023/01</p>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="date-only" id="date-only" />
              <Label htmlFor="date-only" className="cursor-pointer">By date only</Label>
              <p className="text-sm text-muted-foreground">e.g. 2023/01</p>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>File Operation</Label>
          <div className="flex items-center space-x-2 rounded-md border p-4">
            <p className="text-sm text-muted-foreground">
              All files will be <span className="font-semibold text-primary">copied</span> to the destination. The source folder will not be changed.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 p-4 border rounded-lg">
          <Checkbox
            id="detect-duplicates"
            checked={options.detectDuplicates}
            onCheckedChange={(checked) => setDetectDuplicates(!!checked)}
          />
          <div className='grid gap-1.5 leading-none'>
            <Label htmlFor="detect-duplicates" className="cursor-pointer">Detect Duplicates</Label>
            <p className="text-sm text-muted-foreground">
                Uses file hashes to find identical files.
            </p>
          </div>
        </div>
        {options.detectDuplicates && (
          <div className="pl-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable-near-duplicate"
                checked={options.enableNearDuplicate}
                onCheckedChange={(checked) => setEnableNearDuplicate(!!checked)}
              />
              <div className='grid gap-1.5 leading-none'>
                <Label htmlFor="enable-near-duplicate" className="cursor-pointer">Near-duplicate detection (beta)</Label>
                <p className="text-sm text-muted-foreground">
                    Uses perceptual hashes to find visually similar photos. May be slower and use more memory.
                </p>
              </div>
            </div>
            <div className="pl-6 space-y-2">
              <Label>Duplicate Handling</Label>
              <RadioGroup
                value={options.duplicateAction}
                onValueChange={(value) => setDuplicateAction(value as 'skip' | 'copy-to-duplicates')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="cursor-pointer">Skip duplicates</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="copy-to-duplicates" id="copy-dup" />
                  <Label htmlFor="copy-dup" className="cursor-pointer">Copy duplicates to a 'duplicates' folder</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(0)} disabled={isLoading}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleNext} disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Dry-Run'} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}