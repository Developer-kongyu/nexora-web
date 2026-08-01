export async function copyTextToClipboard(value: string): Promise<void> {
  const clipboard = navigator.clipboard;
  const writeText = clipboard?.writeText?.bind(clipboard);
  if (!writeText) {
    throw new Error('clipboard API is unavailable');
  }
  await writeText(value);
}
