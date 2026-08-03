import type { MetadataRoute } from 'next';

// Keeps the site open to regular search engines (SEO matters for the
// waitlist/provider funnel) while opting out of known AI training crawlers
// and keeping internal tooling out of any index. This is a voluntary signal
// — well-behaved crawlers respect it, but it's not a technical block. Real
// protection for scraping is the anti-scraping clause in /terms.
export default function robots(): MetadataRoute.Robots {
  const aiCrawlers = [
    'GPTBot',
    'ChatGPT-User',
    'CCBot',
    'ClaudeBot',
    'Claude-Web',
    'anthropic-ai',
    'Google-Extended',
    'Bytespider',
    'PerplexityBot',
    'Amazonbot',
    'FacebookBot',
    'cohere-ai',
    'Diffbot',
    'Omgilibot',
    'YouBot',
    'Applebot-Extended',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
      ...aiCrawlers.map((userAgent) => ({
        userAgent,
        disallow: '/',
      })),
    ],
  };
}
