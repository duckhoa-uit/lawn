/**
 * SSR-safe clipboard helper.
 *
 * Prefers the modern asynchronous Clipboard API (`navigator.clipboard.writeText`)
 * when available and falls back to a hidden `<textarea>` plus the legacy
 * `document.execCommand("copy")` when the modern API is missing or rejects.
 *
 * The fallback textarea is always cleaned up, even if the copy command throws.
 *
 * Returns `true` when the text was copied successfully, `false` otherwise
 * (including non-browser / SSR environments where no DOM is available).
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const navigator = globalThis.navigator as
    | (Navigator & { clipboard?: { writeText?: (text: string) => Promise<void> } })
    | undefined;

  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy textarea + execCommand fallback below.
    }
  }

  const document = globalThis.document;
  if (!document || typeof document.createElement !== "function") {
    return false;
  }

  const activeElement =
    "activeElement" in document ? (document.activeElement as unknown) : null;
  const previousActiveElement =
    activeElement &&
    typeof (activeElement as { focus?: unknown }).focus === "function"
      ? (activeElement as { focus: () => void })
      : null;
  const selection =
    typeof globalThis.window !== "undefined" &&
    typeof globalThis.window.getSelection === "function"
      ? globalThis.window.getSelection()
      : null;
  const selectionRanges: Range[] = [];
  if (selection) {
    for (let index = 0; index < selection.rangeCount; index += 1) {
      selectionRanges.push(selection.getRangeAt(index).cloneRange());
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  // Position off-screen but keep it focusable/selectable so the copy works.
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.padding = "0";
  textarea.style.border = "none";
  textarea.style.outline = "none";
  textarea.style.boxShadow = "none";
  textarea.style.background = "transparent";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
    // Some browsers need setSelectionRange to actually select the contents.
    textarea.setSelectionRange(0, textarea.value.length);

    const copied = document.execCommand("copy");
    return copied;
  } catch {
    return false;
  } finally {
    if (textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
    if (selection) {
      selection.removeAllRanges();
      for (const range of selectionRanges) {
        selection.addRange(range);
      }
    }
    previousActiveElement?.focus();
  }
}
