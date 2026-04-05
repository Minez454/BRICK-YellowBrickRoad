# Vercel Speed Insights Setup Guide

This guide will help you get started with Vercel Speed Insights in the YellowBrickRoad project.

## Overview

Vercel Speed Insights helps you monitor and optimize your website's performance metrics. It tracks real user data and provides insights into your application's Core Web Vitals and other performance metrics.

## What's Already Done

✅ `@vercel/speed-insights` package installed in dependencies
✅ Speed Insights middleware configured in `server.js`
✅ Automatic script injection into HTML responses
✅ `vercel.json` configuration file created

## Prerequisites

- A Vercel account ([Sign up for free](https://vercel.com/signup))
- Vercel CLI installed locally:
  ```bash
  npm install -g vercel
  ```
- Node.js and npm installed
- Git repository initialized

## Setup Steps

### 1. Enable Speed Insights on Vercel Dashboard

1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your "yellowbrickroad" project
3. Navigate to the **Speed Insights** tab
4. Click the **Enable** button

> **Note:** Enabling Speed Insights will add new routes (`/_vercel/speed-insights/*`) after your next deployment.

### 2. Deploy Your Application to Vercel

#### Option A: Using Vercel CLI (One-time deployment)

```bash
vercel deploy
```

Follow the prompts to:
- Link to your Vercel account
- Confirm project settings
- Deploy your application

#### Option B: Connect Your Git Repository (Recommended for ongoing development)

1. Push your changes to your git repository (main branch)
2. Visit [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New" → "Project"
4. Select your repository
5. Configure build settings if needed
6. Click "Deploy"

Vercel will automatically deploy your application whenever you push to the main branch.

### 3. Monitor Performance Metrics

Once your application is deployed and users have visited your site:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your "yellowbrickroad" project
3. Click the **Speed Insights** tab
4. View your performance data

**Timeline:** After a few days of user traffic, you'll be able to start exploring your metrics in detail.

## How It Works

The Speed Insights integration works as follows:

1. **Middleware Injection**: The `speedInsightsMiddleware` in `server.js` automatically injects the tracking script into HTML responses
2. **Script Loading**: When users visit your site, the script loads from `/_vercel/speed-insights/script.js`
3. **Data Collection**: The script collects performance metrics including:
   - Largest Contentful Paint (LCP)
   - First Input Delay (FID)
   - Cumulative Layout Shift (CLS)
   - First Contentful Paint (FCP)
   - Time to First Byte (TTFB)
   - Navigation Timing

4. **Dashboard Display**: Metrics are aggregated and displayed in your Vercel dashboard

## Development vs. Production

- **Local Development**: Speed Insights script is included but won't collect data (metrics only work on Vercel deployments)
- **Production (Vercel)**: Speed Insights automatically tracks and reports metrics

## Configuration Files

### `middleware/speedInsights.js`
Contains the Express middleware that injects the Speed Insights script into HTML responses.

### `config/speedInsights.js`
Configuration module with utility functions and documentation links.

### `vercel.json`
Vercel deployment configuration that routes requests properly and sets environment variables.

## Troubleshooting

### Speed Insights Not Collecting Data

1. **Verify Deployment**: Check that your app is deployed to Vercel (not just running locally)
2. **Enable on Dashboard**: Confirm Speed Insights is enabled in your Vercel project settings
3. **Wait for Traffic**: Data collection requires real user visits
4. **Check Console**: Look for errors in browser developer console
5. **Verify Script**: Check that `/_vercel/speed-insights/script.js` is accessible

### Script Injection Issues

1. Ensure all HTML responses include `</body>` tag
2. Check that `speedInsightsMiddleware` is applied before other middleware that might modify responses
3. Verify Content-Type header includes `text/html`

## Next Steps

1. **Learn More**: Visit [Speed Insights Documentation](https://vercel.com/docs/speed-insights)
2. **Understand Metrics**: Read about [Core Web Vitals and Metrics](https://vercel.com/docs/speed-insights/metrics)
3. **Optimize Performance**: Use insights to identify and fix performance bottlenecks
4. **Set Up Alerts**: Configure notifications when performance degrades
5. **Monitor Privacy**: Review [Privacy and Compliance Standards](https://vercel.com/docs/speed-insights/privacy-policy)

## Key Documentation Links

- [Speed Insights Main Documentation](https://vercel.com/docs/speed-insights)
- [@vercel/speed-insights Package](https://vercel.com/docs/speed-insights/package)
- [Performance Metrics Guide](https://vercel.com/docs/speed-insights/metrics)
- [Troubleshooting Guide](https://vercel.com/docs/speed-insights/troubleshooting)
- [Pricing and Limits](https://vercel.com/docs/speed-insights/limits-and-pricing)

## Support

For more information and support, visit:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community Discussions](https://github.com/vercel/vercel/discussions)
