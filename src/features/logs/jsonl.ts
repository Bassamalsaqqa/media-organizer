export function downloadJsonl(filename: string, data: any[]) {
  const jsonlContent = data.map(item => JSON.stringify(item)).join('\n');
  const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}