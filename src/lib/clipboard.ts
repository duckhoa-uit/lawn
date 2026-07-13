/**
 * Copy text to the clipboard, awaiting the underlying write so callers can
 * gate success UI on the actual result.
 *
 * Returns `true` only when the clipboard write completes successfully.
 * Returns `false` (without throwing) when the Clipboard API is unavailable
 * (e.g. insecure context) or the write is rejected (e.g. permission denied),
 * so callers never show a spurious "copied" state.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.clipboard?.writeText !== "function"
  ) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard access can be denied or fail on some browsers; surface
    // failure to the caller instead of throwing an unhandled rejection.
    return false;
  }
}
