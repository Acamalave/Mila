// =============================================================================
// Body-scroll lock with reference counting
//
// Multiple components legitimately want to freeze the page scroll
// independently (Modals, mobile menus, full-screen overlays). If each one
// just sets `document.body.style.overflow = "hidden"` on mount and resets
// it on unmount, the LAST one to unmount wins — close a modal that opened
// while a mobile menu was open and the body stays locked until full
// reload. A reference counter avoids that: the body unlocks only when
// every caller has released its lock.
//
// Usage:
//   useEffect(() => {
//     if (!isOpen) return;
//     return lockBodyScroll();   // returns the unlock function
//   }, [isOpen]);
// =============================================================================

let lockCount = 0;
let savedOverflow: string | null = null;

/**
 * Acquire a body-scroll lock. The returned function MUST be called to
 * release the lock — return it directly from a useEffect cleanup.
 * Calling release twice is a no-op (the counter clamps at zero).
 */
export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") return () => {};

  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow || "";
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;

  let released = false;
  return function release() {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = savedOverflow ?? "";
      savedOverflow = null;
    }
  };
}
