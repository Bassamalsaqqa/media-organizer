'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store/app-store';
import { createFsClient } from '@/features/fs';

const fsClient = createFsClient();

export function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const { setSourceHandle, setDestHandle } = useAppStore();

  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        setShowModal(true);
      }
    };

    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const handleRepick = async (type: 'source' | 'dest') => {
    const handle = await fsClient.pickDirectory({ mode: 'readwrite' });
    if (handle) {
      if (type === 'source') {
        setSourceHandle(handle);
      } else {
        setDestHandle(handle);
      }
      setShowModal(false);
    }
  };

  return (
    <>
      {children}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Directory handle is no longer valid</DialogTitle>
            <DialogDescription>
              The source or destination directory has been moved or permissions have changed. Please select the directory again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => handleRepick('source')}>Re-select Source</Button>
            <Button onClick={() => handleRepick('dest')}>Re-select Destination</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
