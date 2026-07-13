type ClipboardWriteText = (text: string) => Promise<void>;

/**
 * Resolves the `navigator.clipboard.writeText` method bound to its clipboard
 * instance, or `undefined` when the Clipboard API is unavailable (e.g. an
 * insecure context or an environment without `navigator`).
 */
function resolveClipboardWriteText(): ClipboardWriteText | undefined {
  if (typeof navigator === "undefined") return undefined;
  const clipboard = navigator.clipboard;
  if (!clipboard || typeof clipboard.writeText !== "function") return undefined;
  return clipboard.writeText.bind(clipboard);
}

/**
 * Copies `text` to the clipboard, awaiting the underlying write so callers
 * only treat the operation as successful once it has actually completed.
 *
 * Returns `true` when the text was written, or `false` when clipboard access
 * is unavailable or the write was rejected (e.g. permission denied). This
 * never throws, so callers can safely gate success-state UI behind the result
 * without showing a false "copied" state on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const writeText = resolveClipboardWriteText();
  if (!writeText) return false;
  try {
    await writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function buildShareUrl(origin: string, token: string): string {
  return `${origin}/share/${token}`;
}

export function buildPublicWatchUrl(origin: string, publicId: string): string {
  return `${origin}/watch/${publicId}`;
}
