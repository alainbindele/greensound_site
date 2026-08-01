import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets scroll on every route change.
 *
 * React Router keeps the window scroll position across navigations, so moving
 * from the bottom of a long page to a short one drops you halfway down the new
 * one. `instant` rather than the stylesheet's smooth behaviour: a page change
 * should feel like a page change, not a scroll.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
