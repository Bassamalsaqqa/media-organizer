import { APP_NAME } from '@/config/constants';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const stepNames = ['Folders', 'Options', 'Dry-Run', 'Execute'];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const currentStep = useAppStore((state) => state.currentStep);
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-2xl font-bold text-primary flex items-center">
              <img src="/app-icon.png" alt="App Icon" className="h-10 w-10 mr-2" />
              {APP_NAME}
            </h1>
            <div className="flex items-center gap-4">
              <span className="font-code text-sm text-muted-foreground hidden sm:inline">Local-First Media Organizer</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-12">
            <nav aria-label="Progress">
                <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
                    {stepNames.map((stepName, stepIdx) => (
                    <li key={stepName} className="md:flex-1">
                        {currentStep > stepIdx ? (
                        <a
                            href="#"
                            onClick={(e) => { e.preventDefault(); setCurrentStep(stepIdx); }}
                            className="group flex flex-col border-l-4 border-primary py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4"
                        >
                            <span className="text-sm font-medium text-primary transition-colors ">{`Step ${stepIdx + 1}`}</span>
                            <span className="text-sm font-medium">{stepName}</span>
                        </a>
                        ) : currentStep === stepIdx ? (
                        <a
                            href="#"
                            onClick={(e) => e.preventDefault()}
                            className="flex flex-col border-l-4 border-primary py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4"
                            aria-current="step"
                        >
                            <span className="text-sm font-medium text-primary">{`Step ${stepIdx + 1}`}</span>
                            <span className="text-sm font-medium">{stepName}</span>
                        </a>
                        ) : (
                        <a
                            href="#"
                            onClick={(e) => e.preventDefault()}
                            className="group flex flex-col border-l-4 border-border py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4"
                        >
                            <span className="text-sm font-medium text-muted-foreground transition-colors">{`Step ${stepIdx + 1}`}</span>
                            <span className="text-sm font-medium">{stepName}</span>
                        </a>
                        )}
                    </li>
                    ))}
                </ol>
            </nav>
        </div>
        {children}
      </main>
      <footer className="border-t">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Built by <a href="https://github.com/Bassamalsaqqa" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Bassam Alsaqqa</a>, Broadcast Engineer & Developer.
              <a href="https://www.linkedin.com/in/bassamalsaqqa/" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline ml-2">LinkedIn</a>
            </p>
            <div className="flex items-center gap-4">
              <a href="/docs/architecture-review.md" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary">
                Architecture
              </a>
              <a href="/docs/blueprint.md" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary">
                Blueprint
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
