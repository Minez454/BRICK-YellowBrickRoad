/**
 * Vercel Speed Insights Configuration
 * 
 * This file exports configuration and utility functions for Speed Insights integration
 * in the YellowBrickRoad project.
 * 
 * For more information, visit: https://vercel.com/docs/speed-insights
 */

/**
 * Speed Insights setup instructions for deployment to Vercel:
 * 
 * 1. Prerequisites:
 *    - A Vercel account (https://vercel.com/signup)
 *    - Vercel CLI installed (npm install -g vercel)
 * 
 * 2. Enable Speed Insights on Vercel Dashboard:
 *    - Visit https://vercel.com/dashboard
 *    - Select your project
 *    - Go to the "Speed Insights" tab
 *    - Click "Enable"
 * 
 * 3. Deploy to Vercel:
 *    - Run: vercel deploy
 *    - Or connect your git repository for automatic deployments
 * 
 * 4. Monitor Performance:
 *    - Go to your Vercel Dashboard
 *    - Select your project
 *    - Click the "Speed Insights" tab
 *    - View performance metrics after users visit your site
 * 
 * The @vercel/speed-insights package is already installed and the middleware
 * is configured in server.js to automatically inject the tracking script.
 */

module.exports = {
  // Configuration object for Speed Insights
  config: {
    // The script will be automatically injected by the speedInsights middleware
    scriptPath: '/_vercel/speed-insights/script.js',
    
    // Speed Insights is available on Vercel deployments
    // Local development will not track metrics
    enabled: process.env.NODE_ENV === 'production' || process.env.VERCEL === 'true',
    
    // Version of the speed-insights package
    version: '1.3.1'
  },

  /**
   * Gets the HTML script tag for manual injection if needed
   * Usually not required as the middleware handles this automatically
   */
  getScriptTag: () => {
    return `
  <script>
    window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/speed-insights/script.js"><\/script>`;
  },

  /**
   * Information about what's tracked by Speed Insights
   */
  trackedMetrics: [
    'Largest Contentful Paint (LCP) - loading performance',
    'First Input Delay (FID) - interactivity',
    'Cumulative Layout Shift (CLS) - visual stability',
    'First Contentful Paint (FCP)',
    'Time to First Byte (TTFB)',
    'Navigation Timing'
  ],

  /**
   * Documentation links
   */
  docs: {
    main: 'https://vercel.com/docs/speed-insights',
    package: 'https://vercel.com/docs/speed-insights/package',
    metrics: 'https://vercel.com/docs/speed-insights/metrics',
    troubleshooting: 'https://vercel.com/docs/speed-insights/troubleshooting'
  }
};
