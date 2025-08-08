import { useEffect } from 'react';

// Minimal utility to force Recharts ResponsiveContainer to recalc sizes
// Useful for installed PWAs where viewport/visibility changes can yield 0-sized containers
export function useRechartsRedraw() {
  useEffect(() => {
    const trigger = () => window.dispatchEvent(new Event('resize'));

    // Trigger once after mount to ensure initial layout is correct
    const t1 = setTimeout(trigger, 50);

    // When app/tab becomes visible again, trigger resize so charts recalc
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(trigger, 50);
      }
    };

    // Orientation changes can also break chart sizing in PWAs
    const onOrientation = () => setTimeout(trigger, 50);

    // Some browsers fire pageshow when returning from background
    const onPageShow = () => setTimeout(trigger, 50);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('orientationchange', onOrientation);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      clearTimeout(t1);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('orientationchange', onOrientation);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);
}
