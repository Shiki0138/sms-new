import { useEffect } from 'react';

export const usePerformanceOptimization = () => {
  useEffect(() => {
    try {
      // Prefetch critical resources
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          // Prefetch route components
          const routes = [
            '/customers',
            '/reservations',
            '/messages',
            '/settings',
          ];
          routes.forEach((route) => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = route;
            document.head.appendChild(link);
          });
        });
      }

      // Enable smooth scrolling
      document.documentElement.style.scrollBehavior = 'smooth';

      // Optimize images loading
      if ('loading' in HTMLImageElement.prototype) {
        const images = document.querySelectorAll('img');
        images.forEach((img) => {
          if (!img.loading) {
            img.loading = 'lazy';
          }
        });
      }

      // Clean up
      return () => {
        document.documentElement.style.scrollBehavior = '';
      };
    } catch (error) {
      console.error('Performance optimization failed:', error);
      // Don't throw - optimization failures shouldn't break the app
    }
  }, []);
};
