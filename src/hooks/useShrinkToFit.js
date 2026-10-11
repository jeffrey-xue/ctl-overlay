import { useLayoutEffect } from 'react';

// Sets --fit (0..1) on the element; CSS multiplies font-size by it.
export function useShrinkToFit(ref, text) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Native text-fit handles it where supported.
    if (typeof CSS !== 'undefined' && CSS.supports('text-fit', 'shrink')) return;

    let cancelled = false;

    const fit = () => {
      if (cancelled) return;
      el.style.setProperty('--fit', '1');

      const cs = getComputedStyle(el);
      const available = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (available <= 0) return;

      const range = document.createRange();
      range.selectNodeContents(el);
      const needed = range.getBoundingClientRect().width;

      if (needed > available) {
        el.style.setProperty('--fit', String(available / needed));
      }
    };

    fit();
    document.fonts?.ready.then(fit);

    return () => {
      cancelled = true;
    };
  }, [ref, text]);
}
