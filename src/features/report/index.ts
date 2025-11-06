import type { OrganizationPlan } from '@/types/media';

export function exportJson(plan: OrganizationPlan): string {
  const cliPlan = {
    items: plan.items.map(item => ({
      action: item.action,
      source: item.file.ref.srcPath,
      destination: item.destRelPath,
      size: item.file.ref.size,
      sha256: item.file.hashes.sha256,
      takenDate: item.file.meta.takenDate,
    })),
  };
  return JSON.stringify(cliPlan, null, 2);
}

export function exportCsv(plan: OrganizationPlan): string {
  const header = 'action,source,destination,reason\n';
  const rows = plan.items.map(a =>
    `${a.action},"${a.file.ref.srcPath}","${a.destRelPath}","${a.reason || ''}"`
  ).join('\n');
  return header + rows;
}

export function exportLogsJson(logs: string[]): string {
  return JSON.stringify(logs, null, 2);
}

export function exportLogsTxt(logs: string[]): string {
  return logs.join('\n');
}