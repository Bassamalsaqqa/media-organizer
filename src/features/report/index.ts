import type { OrganizationPlan } from '@/types/media';

// Placeholder for report generation
export function exportJson(plan: OrganizationPlan): string {
  return JSON.stringify(plan, null, 2);
}

export function exportCsv(plan: OrganizationPlan): string {
  const header = 'type,source,destination,reason\n';
  const rows = plan.actions.map(a => 
    `${a.type},"${a.source}","${a.destination}","${a.reason || ''}"`
  ).join('\n');
  return header + rows;
}
