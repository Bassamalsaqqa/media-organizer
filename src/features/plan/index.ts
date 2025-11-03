import type { MediaFile, OrganizeOptions, OrganizationPlan } from '@/types/media';

// Placeholder for the pure function `buildPlan`
export function buildPlan(files: MediaFile[], opts: OrganizeOptions): OrganizationPlan {
  console.log('Building organization plan...');
  const actions = files.map((file, i) => {
    const isDuplicate = i % 5 === 0;
    if (isDuplicate && opts.detectDuplicates) {
        if (opts.duplicateAction === 'skip') {
            return {
                type: 'skip' as const,
                source: file.path,
                destination: '',
                reason: 'duplicate' as const
            };
        } else {
             return {
                type: 'move' as const,
                source: file.path,
                destination: `duplicates/${file.name}`,
                reason: 'duplicate' as const
            };
        }
    }
    
    // Mock routing by year/month
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    return {
      type: 'move' as const,
      source: file.path,
      destination: `${year}/${month}/${file.name}`,
    };
  });

  return {
    actions: actions,
    stats: {
      totalFiles: files.length,
      toCopy: 0,
      toMove: actions.filter(a => a.type === 'move').length,
      skipped: actions.filter(a => a.type === 'skip').length,
    }
  };
}

export function resolveDest(file: MediaFile, opts: OrganizeOptions): string {
    // Placeholder
    return `new/path/${file.name}`;
}

export function resolveCollision(path: string): string {
    // Placeholder
    return path.replace(/(\.[\w\d_-]+)$/i, '_copy$1');
}
