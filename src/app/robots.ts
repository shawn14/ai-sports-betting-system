import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/account', '/_next/', '/private/'],
      },
      // AI crawlers - allow access to llms.txt and main content
      {
        userAgent: 'GPTBot',
        allow: ['/', '/llms.txt'],
        disallow: ['/api/', '/admin/', '/account'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/', '/llms.txt'],
        disallow: ['/api/', '/admin/', '/account'],
      },
      {
        userAgent: 'Claude-Web',
        allow: ['/', '/llms.txt'],
        disallow: ['/api/', '/admin/', '/account'],
      },
      {
        userAgent: 'Anthropic-AI',
        allow: ['/', '/llms.txt'],
        disallow: ['/api/', '/admin/', '/account'],
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/', '/llms.txt'],
        disallow: ['/api/', '/admin/', '/account'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/', '/llms.txt'],
        disallow: ['/api/', '/admin/', '/account'],
      },
      {
        userAgent: 'Bytespider',
        allow: ['/', '/llms.txt'],
        disallow: ['/api/', '/admin/', '/account'],
      },
    ],
    sitemap: 'https://www.predictionmatrix.com/sitemap.xml',
    host: 'https://www.predictionmatrix.com',
  };
}
