'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toSafeError } from '@/features/logs';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const safeError = toSafeError(this.state.error, { where: 'ErrorBoundary' });
      return (
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>An unexpected error occurred.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-500 font-code">
              [{safeError.code}] {safeError.message}
            </p>
            <p className="text-sm text-muted-foreground">
              Try the following:
              <ul className="list-disc list-inside pl-4">
                <li>Retry the file or action.</li>
                <li>Check file and folder permissions.</li>
                <li>Refresh the page and try again.</li>
              </ul>
            </p>
            <Button onClick={() => this.setState({ hasError: false, error: null })}>Try again</Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
