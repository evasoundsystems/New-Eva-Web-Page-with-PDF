/**
 * Reliable clipboard copy helper that works in standard browsers, iOS Safari,
 * and sandboxed/iframe preview contexts where navigator.clipboard.writeText
 * may reject with NotAllowedError.
 *
 * Runs the synchronous textarea + execCommand('copy') fallback while the user
 * click gesture is still active when Clipboard API is unavailable or blocked,
 * and falls back cleanly between both APIs.
 */
function copyViaExecCommand(text: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Run synchronous execCommand('copy') while the browser's user click gesture
  // is still active (works across Chrome, Safari, iOS, and sandboxed iframes).
  if (copyViaExecCommand(text)) {
    return true;
  }

  // Fallback to async Clipboard API if execCommand is unavailable.
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
