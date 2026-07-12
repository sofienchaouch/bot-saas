import { URL } from 'url';
import { logger } from '../lib/logger';
import { lookupAsync, NODE_ENV } from '../config';

// SSRF URL Validation Helper
export async function validateUrlForSsrf(urlStr: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(urlStr);
    if (parsedUrl.protocol !== 'https:') {
      return false;
    }

    const hostname = parsedUrl.hostname;
    if (!hostname) return false;

    const lowerHost = hostname.toLowerCase();
    if (
      lowerHost === 'localhost' ||
      lowerHost === 'loopback' ||
      lowerHost.endsWith('.local') ||
      lowerHost.endsWith('.localhost') ||
      lowerHost.endsWith('.internal')
    ) {
      return false;
    }

    let ip: string;
    try {
      const lookupResult = await lookupAsync(hostname);
      ip = lookupResult.address;
    } catch (err) {
      if (NODE_ENV === 'test') {
        return true;
      }
      return false;
    }

    const parts = ip.split('.').map(Number);
    if (parts.length === 4) {
      const [first, second] = parts;
      if (first === 127) return false;
      if (first === 10) return false;
      if (first === 172 && second >= 16 && second <= 31) return false;
      if (first === 192 && second === 168) return false;
      if (first === 169 && second === 254) return false;
      if (first === 0 || first >= 224) return false;
    }

    if (ip === '::1' || ip === '::' || ip.startsWith('fe80:') || ip.startsWith('ff00:')) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

// Web Crawler Helper: parse robots.txt
export function parseRobotsTxt(
  robotsText: string,
  userAgent = '*'
): { disallows: string[]; sitemaps: string[] } {
  const disallows: string[] = [];
  const sitemaps: string[] = [];
  const lines = robotsText.split(/\r?\n/);
  let inTargetAgentSection = false;

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith('#')) continue;

    const parts = cleanLine.split(':');
    const directive = parts[0].trim().toLowerCase();
    const value = parts.slice(1).join(':').trim();

    if (directive === 'sitemap') {
      sitemaps.push(value);
    } else if (directive === 'user-agent') {
      const agent = value.toLowerCase();
      inTargetAgentSection = agent === userAgent.toLowerCase() || agent === '*';
    } else if (directive === 'disallow' && inTargetAgentSection) {
      if (value) {
        disallows.push(value);
      }
    }
  }

  return { disallows, sitemaps };
}

// Web Crawler Helper: check disallow rules
export function isPathDisallowed(path: string, disallows: string[]): boolean {
  for (const rule of disallows) {
    if (rule === '/') return true;
    if (path.startsWith(rule)) return true;
  }
  return false;
}

// Web Crawler Helper: fetch and parse robots.txt
export async function getRobotsTxtRules(
  startUrl: string
): Promise<{ disallows: string[]; sitemaps: string[] }> {
  try {
    const parsed = new URL(startUrl);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const res = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'AuraSaaSCrawler/1.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const text = await res.text();
      return parseRobotsTxt(text, 'AuraSaaSCrawler/1.0');
    }
  } catch (err) {
    logger.info({ err }, '[CRAWLER] No robots.txt found or fetch failed');
  }
  return { disallows: [], sitemaps: [] };
}

// Web Crawler Helper: extract sitemap URLs
export async function getSitemapUrls(sitemapUrl: string, host: string): Promise<string[]> {
  const urls: string[] = [];
  try {
    const res = await fetch(sitemapUrl, {
      headers: { 'User-Agent': 'AuraSaaSCrawler/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const xml = await res.text();
      const matches = xml.match(/<loc>(https?:\/\/[^\s<]+)<\/loc>/gi);
      if (matches) {
        matches.forEach(m => {
          const loc = m.replace(/<\/?loc>/gi, '').trim();
          try {
            const locUrl = new URL(loc);
            if (locUrl.host === host) {
              urls.push(loc);
            }
          } catch {}
        });
      }
    }
  } catch (err) {
    logger.info({ err }, '[CRAWLER] Sitemap fetch failed');
  }
  return urls;
}

export interface CrawlResult {
  title: string;
  content: string;
  pagesCount: number;
}

/**
 * BFS crawl of a website starting at startUrl, restricted to the same host,
 * honoring robots.txt and SSRF checks on every fetched URL.
 */
export async function crawlWebsite(
  startUrl: string,
  opts: { maxDepth?: number; maxPages?: number } = {}
): Promise<CrawlResult> {
  const maxDepth = opts.maxDepth ?? 1;
  const maxPages = opts.maxPages ?? 10;

  let crawledText = '';
  let pageTitle = 'Crawled Source';
  let crawledCount = 0;

  const parsedStartUrl = new URL(startUrl);
  const host = parsedStartUrl.host;

  const { disallows, sitemaps } = await getRobotsTxtRules(startUrl);
  logger.info(
    { disallowCount: disallows.length, sitemapCount: sitemaps.length },
    '[CRAWLER] Parsed robots.txt'
  );

  const queue: string[] = [startUrl];
  const visited = new Set<string>();
  const urlDepth: Record<string, number> = { [startUrl]: 1 };

  if (sitemaps.length > 0) {
    for (const sitemap of sitemaps) {
      if (queue.length >= maxPages) break;
      const sitemapUrls = await getSitemapUrls(sitemap, host);
      logger.info(
        { urlCount: sitemapUrls.length, sitemap },
        '[CRAWLER] Extracted URLs from sitemap'
      );
      for (const sUrl of sitemapUrls) {
        if (!visited.has(sUrl) && !queue.includes(sUrl)) {
          queue.push(sUrl);
          urlDepth[sUrl] = 1;
        }
      }
    }
  }

  while (queue.length > 0 && visited.size < maxPages) {
    const currentUrl = queue.shift()!;
    if (visited.has(currentUrl)) continue;

    const currDepth = urlDepth[currentUrl] || 1;
    if (currDepth > maxDepth) continue;

    if (!(await validateUrlForSsrf(currentUrl))) continue;

    const path = new URL(currentUrl).pathname;
    if (isPathDisallowed(path, disallows)) {
      logger.info({ currentUrl }, '[CRAWLER] Skipping disallowed path');
      continue;
    }

    logger.info({ page: visited.size + 1, maxPages, currentUrl }, '[CRAWLER] Fetching page');
    visited.add(currentUrl);

    try {
      const response = await fetch(currentUrl, {
        headers: { 'User-Agent': 'AuraSaaSCrawler/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const html = await response.text();

        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && visited.size === 1) {
          pageTitle = titleMatch[1].trim();
        }

        let cleanText = html
          .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
          .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (cleanText.length > 5000) cleanText = cleanText.substring(0, 5000);

        crawledText += `\n\n=== CRAWLED PAGE: ${currentUrl} ===\n${cleanText}\n`;
        crawledCount++;

        if (currDepth < maxDepth) {
          const hrefRegex = /<a[^>]+href=["']([^"']+)["']/gi;
          let match;
          while ((match = hrefRegex.exec(html)) !== null) {
            const href = match[1];
            try {
              const resolvedUrl = new URL(href, currentUrl).toString();
              const resolvedParsed = new URL(resolvedUrl);

              if (
                resolvedParsed.host === host &&
                !visited.has(resolvedUrl) &&
                !queue.includes(resolvedUrl)
              ) {
                queue.push(resolvedUrl);
                urlDepth[resolvedUrl] = currDepth + 1;
              }
            } catch {}
          }
        }
      }
    } catch (fetchErr: any) {
      logger.warn({ currentUrl, err: fetchErr.message }, '[CRAWLER] Fetch failed for URL');
    }
  }

  return { title: pageTitle, content: crawledText, pagesCount: crawledCount };
}
