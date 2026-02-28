import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop({ waitForContent = 0 }) {
  const { pathname } = useLocation();

  useEffect(() => {
    // Даем контенту время отрендериться
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, waitForContent);

    return () => clearTimeout(timer);
  }, [pathname, waitForContent]);

  return null;
}

export function ScrollToTopAdmin({ containerId = 'admin-content', wait = 50 }) {
  const { pathname } = useLocation();

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const timer = setTimeout(() => {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }, wait);

    return () => clearTimeout(timer);
  }, [pathname, containerId, wait]);

  return null;
}