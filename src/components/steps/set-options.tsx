'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAppStore } from '@/store/app-store';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { buildPlan } from '@/features/plan';
import { useToast } from '@/hooks/use-toast';

export default function SetOptions() {
  const { options, setOptions, setCurrentStep, files, setPlan } = useAppStore();
  const { toast } = useToast();

  const handleNext = () => {
    if (files.length === 0) {
      toast({
        variant: "destructive",
        title: "No files found",
        description: "Go back and select a source folder with media files.",
      });
      return;
    }
    const plan = buildPlan(files, options);
    setPlan(plan);
    setCurrentStep(2);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Organization Options</CardTitle>
        <CardDescription>Define how you want your media to be organized.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="pattern">Folder Pattern</Label>
          <Input 
            id="pattern"
            value={options.pattern}
            onChange={(e) => setOptions({ pattern: e.target.value })}
            className="font-code"
          />
          <p className="text-sm text-muted-foreground">
            Use placeholders like {'{YYYY}'}, {'{MM}'}, {'{DD}'}.
          </p>
        </div>
        <div className="flex items-center space-x-2 p-4 border rounded-lg">
          <Checkbox 
            id="detect-duplicates"
            checked={options.detectDuplicates}
            onCheckedChange={(checked) => setOptions({ detectDuplicates: !!checked })}
          />
          <div className='grid gap-1.5 leading-none'>
            <Label htmlFor="detect-duplicates" className="cursor-pointer">Detect Duplicates</Label>
            <p className="text-sm text-muted-foreground">
                Uses file hashes to find identical files.
            </p>
          </div>
        </div>
        {options.detectDuplicates && (
          <div className="pl-6 space-y-2">
            <Label>Duplicate Handling</Label>
            <RadioGroup
              value={options.duplicateAction}
              onValueChange={(value) => setOptions({ duplicateAction: value as 'skip' | 'move' })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="skip" id="skip" />
                <Label htmlFor="skip" className="cursor-pointer">Skip duplicates</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="move" id="move" />
                <Label htmlFor="move" className="cursor-pointer">Move duplicates to a 'duplicates' folder</Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(0)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleNext}>
          Generate Dry-Run <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
