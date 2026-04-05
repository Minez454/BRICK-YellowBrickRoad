/**
 * Speed Insights Middleware
 * 
 * This middleware injects the Vercel Speed Insights script into HTML responses.
 * Speed Insights helps you monitor and optimize your website's performance metrics.
 * 
 * More information: https://vercel.com/docs/speed-insights
 */

const express = require('express');

/**
 * Middleware that injects Speed Insights script into HTML responses
 * This should be applied after other middleware but before serving static files
 */
function speedInsightsMiddleware(req, res, next) {
  // Store the original send function
  const originalSend = res.send;

  // Override the send function
  res.send = function (data) {
    // Only process HTML responses
    if (
      res.get('content-type') &&
      res.get('content-type').includes('text/html') &&
      typeof data === 'string'
    ) {
      // Inject Speed Insights script before closing body tag
      const speedInsightsScript = `
  <script>
    window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/speed-insights/script.js"><\/script>
`;

      // Insert the script before the closing body tag
      if (data.includes('</body>')) {
        data = data.replace('</body>', speedInsightsScript + '\n</body>');
      } else if (data.includes('</html>')) {
        // Fallback if no body tag
        data = data.replace('</html>', speedInsightsScript + '\n</html>');
      }
    }

    // Call the original send function with modified data
    return originalSend.call(this, data);
  };

  next();
}

module.exports = speedInsightsMiddleware;
