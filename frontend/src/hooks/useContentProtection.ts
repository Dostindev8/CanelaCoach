import { useEffect } from 'react';

/**
 * Raise friction against casual copy on proprietary content.
 * Never use on login/register/payment forms (breaks paste UX).
 */
export function useContentProtection(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const blockContextMenu = (e: MouseEvent) => e.preventDefault();
    const blockCopyShortcuts = (e: KeyboardEvent) => {
      const blocked =
        (e.ctrlKey || e.metaKey) && ['c', 'u', 's', 'p'].includes(e.key.toLowerCase());
      const devtools =
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()));
      if (blocked || devtools) e.preventDefault();
    };
    const blockSelection = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
    };

    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('keydown', blockCopyShortcuts);
    document.addEventListener('selectstart', blockSelection);

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('keydown', blockCopyShortcuts);
      document.removeEventListener('selectstart', blockSelection);
    };
  }, [enabled]);
}
