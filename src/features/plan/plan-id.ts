import type { OrganizationPlan } from '@/types/media';

/**
 * Generates a deterministic ID for an organization plan.
 * This is used to uniquely identify a plan for resuming execution.
 * The ID is a hash of the plan's options and the sorted list of source file paths.
 * @param plan The organization plan.
 * @returns A promise that resolves to a unique plan ID string.
 */
export async function generatePlanId(plan: OrganizationPlan): Promise<string> {
  const relevantData = {
    options: plan.options,
    files: plan.items.map((item) => item.file.ref.srcPath).sort(),
  };
  const dataString = JSON.stringify(relevantData);
  const encoder = new TextEncoder();
  const data = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  
  // Use a truncated hash for brevity, prefixed with file count for readability
  return `${plan.summary.totals.files}-${hashHex.substring(0, 16)}`;
}
