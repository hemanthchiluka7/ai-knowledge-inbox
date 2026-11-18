import https from 'node:https';
import http from 'node:http';
import { lookup } from 'node:dns/promises';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import ipaddr from 'ipaddr.js';
import { AppError, ErrorCode } from '../lib/errors';

const TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const MIN_TEXT_CHARS = 200;
const BLOCKED_RANGES = new Set([
  'loopback', 'private', 'uniqueLocal', 'linkLocal',
  'multicast', 'unspecified', 'reserved', 'broadcast',
]);

export interface FetchResult {
  title: string | null;
  text: string;
  finalUrl: string;
}

// Injectable for tests (lets tests mock DNS without real network calls)
let _dnsLookup: typeof lookup = lookup;
export function setDnsLookup(fn: typeof lookup): void {
  _dnsLookup = fn;
}

function validateUrl(raw: string): URL {
  let parsed: URL;
  try { parsed = new URL(raw); } catch {
    throw new AppError(ErrorCode.URL_NOT_ALLOWED, 'Invalid URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError(ErrorCode.URL_NOT_ALLOWED, `Unsupported scheme: ${parsed.protocol}`);
  }
  if (parsed.username || parsed.password) {
    throw new AppError(ErrorCode.URL_NOT_ALLOWED, 'URL must not contain credentials');
  }
  return parsed;
}

async function checkSsrf(hostname: string): Promise<void> {
  let address: string;
  try {
    const result = await _dnsLookup(hostname);
    address = result.address;
  } catch {
    throw new AppError(ErrorCode.URL_NOT_ALLOWED, `Cannot resolve hostname: ${hostname}`);
  }

  try {
    const range = ipaddr.parse(address).range();
    if (BLOCKED_RANGES.has(range)) {
      throw new AppError(ErrorCode.URL_NOT_ALLOWED, `URL resolves to a blocked IP range (${range}): ${address}`);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ErrorCode.URL_NOT_ALLOWED, `Invalid resolved IP: ${address}`);
  }
}

interface RawResponse {
  statusCode: number;
  contentType: string;
  location: string | undefined;
  body: Buffer;
}

function rawGet(url: URL): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    const req = transport.get(
      url.toString(),
      { headers: { 'User-Agent': 'AI-Knowledge-Inbox/1.0', Accept: 'text/html' }, timeout: TIMEOUT_MS },
      (res) => {
        res.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_BODY_BYTES) {
            req.destroy();
            return reject(new AppError(ErrorCode.UPSTREAM_FETCH_FAILED, 'Response exceeds 2 MB limit'));
          }
          chunks.push(chunk);
        });
        res.on('end', () =>
          resolve({
            statusCode: res.statusCode ?? 0,
            contentType: (res.headers['content-type'] as string) ?? '',
            location: res.headers['location'] as string | undefined,
            body: Buffer.concat(chunks),
          }),
        );
        res.on('error', (e) => reject(new AppError(ErrorCode.UPSTREAM_FETCH_FAILED, e.message)));
      },
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new AppError(ErrorCode.UPSTREAM_FETCH_FAILED, `Request timed out after ${TIMEOUT_MS}ms`));
    });
    req.on('error', (e) => reject(new AppError(ErrorCode.UPSTREAM_FETCH_FAILED, e.message)));
  });
}

function extractText(html: string, url: string): FetchResult {
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();

  const title = article?.title ?? dom.window.document.title ?? null;
  const text = (article?.textContent ?? dom.window.document.body?.textContent ?? '').trim();

  if (text.length < MIN_TEXT_CHARS) {
    throw new AppError(ErrorCode.URL_NOT_ALLOWED, `Extracted text too short (${text.length} chars, min ${MIN_TEXT_CHARS})`);
  }

  return { title: title || null, text, finalUrl: url };
}

export async function fetchUrl(rawUrl: string): Promise<FetchResult> {
  let current = validateUrl(rawUrl);
  await checkSsrf(current.hostname);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await rawGet(current);

    if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.location) {
      const next = validateUrl(new URL(res.location, current.toString()).toString());
      await checkSsrf(next.hostname);
      current = next;
      continue;
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new AppError(ErrorCode.UPSTREAM_FETCH_FAILED, `HTTP ${res.statusCode} from ${current.toString()}`);
    }
    if (!res.contentType.includes('text/html')) {
      throw new AppError(ErrorCode.URL_NOT_ALLOWED, `Expected text/html, got: ${res.contentType}`);
    }

    return extractText(res.body.toString('utf-8'), current.toString());
  }

  throw new AppError(ErrorCode.UPSTREAM_FETCH_FAILED, 'Too many redirects');
}
