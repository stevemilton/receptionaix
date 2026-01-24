import type { ScrapedContent } from './types';

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      sourceURL?: string;
    };
  };
  error?: string;
}

/**
 * Scrape a website using Firecrawl API
 */
export async function scrapeWebsite(
  url: string,
  apiKey: string
): Promise<ScrapedContent | null> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
      }),
    });

    if (!response.ok) {
      console.error(`Firecrawl error: ${response.status} ${response.statusText}`);
      return null;
    }

    const result: FirecrawlResponse = await response.json();

    if (!result.success || !result.data?.markdown) {
      console.error('Firecrawl returned no content:', result.error);
      return null;
    }

    return {
      url: result.data.metadata?.sourceURL || url,
      title: result.data.metadata?.title || null,
      markdown: result.data.markdown,
      scrapedAt: new Date(),
    };
  } catch (error) {
    console.error('Firecrawl request failed:', error);
    return null;
  }
}

/**
 * Crawl multiple pages of a website (for larger sites)
 */
export async function crawlWebsite(
  url: string,
  apiKey: string,
  maxPages: number = 5
): Promise<ScrapedContent[]> {
  try {
    // Start crawl job
    const startResponse = await fetch('https://api.firecrawl.dev/v1/crawl', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        limit: maxPages,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    if (!startResponse.ok) {
      console.error(`Firecrawl crawl error: ${startResponse.status}`);
      return [];
    }

    const { id: jobId } = await startResponse.json();

    // Poll for completion (with timeout)
    const maxAttempts = 30;
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(
        `https://api.firecrawl.dev/v1/crawl/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!statusResponse.ok) continue;

      const status = await statusResponse.json();

      if (status.status === 'completed' && status.data) {
        return status.data.map((page: { markdown?: string; metadata?: { title?: string; sourceURL?: string } }) => ({
          url: page.metadata?.sourceURL || url,
          title: page.metadata?.title || null,
          markdown: page.markdown || '',
          scrapedAt: new Date(),
        }));
      }

      if (status.status === 'failed') {
        console.error('Firecrawl crawl failed');
        return [];
      }
    }

    console.error('Firecrawl crawl timed out');
    return [];
  } catch (error) {
    console.error('Firecrawl crawl request failed:', error);
    return [];
  }
}
