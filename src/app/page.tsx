'use client';

import { MainLayout } from '@/components/main-layout';
import SelectFolders from '@/components/steps/select-folders';
import SetOptions from '@/components/steps/set-options';
import DryRun from '@/components/steps/dry-run';
import ExecuteProgress from '@/components/steps/execute-progress';
import { useAppStore } from '@/store/app-store';

const steps = [
  { name: 'Folders', component: SelectFolders },
  { name: 'Options', component: SetOptions },
  { name: 'Dry-Run', component: DryRun },
  { name: 'Execute', component: ExecuteProgress },
];

export default function Home() {
  const currentStep = useAppStore((state) => state.currentStep);
  const CurrentStepComponent = steps[currentStep].component;

  return (
    <MainLayout>
      <CurrentStepComponent />
    </MainLayout>
  );
}
