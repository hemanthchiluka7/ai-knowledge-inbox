import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setDnsLookup, fetchUrl } from '../../src/clients/urlFetcher';
import nock from 'nock';

type LookupResult = { address: string; family: 4 | 6 };

const mockDns = (address: string, family: 4 | 6 = 4) =>
  vi.fn().mockResolvedValue({ address, family } as LookupResult);

beforeEach(() => {
  nock.cleanAll();
});

describe('SSRF protection', () => {
  it('blocks loopback IPv4 (127.0.0.1)', async () => {
    setDnsLookup(mockDns('127.0.0.1'));
    await expect(fetchUrl('http://localhost/page')).rejects.toMatchObject({ code: 'URL_NOT_ALLOWED' });
  });

  it('blocks private class-A (10.x.x.x)', async () => {
    setDnsLookup(mockDns('10.0.0.1'));
    await expect(fetchUrl('http://internal/page')).rejects.toMatchObject({ code: 'URL_NOT_ALLOWED' });
  });

  it('blocks private class-B (172.16.x.x)', async () => {
    setDnsLookup(mockDns('172.16.0.1'));
    await expect(fetchUrl('http://internal/page')).rejects.toMatchObject({ code: 'URL_NOT_ALLOWED' });
  });

  it('blocks private class-C (192.168.x.x)', async () => {
    setDnsLookup(mockDns('192.168.1.1'));
    await expect(fetchUrl('http://internal/page')).rejects.toMatchObject({ code: 'URL_NOT_ALLOWED' });
  });

  it('blocks link-local (169.254.x.x)', async () => {
    setDnsLookup(mockDns('169.254.169.254')); // AWS metadata endpoint
    await expect(fetchUrl('http://metadata/latest')).rejects.toMatchObject({ code: 'URL_NOT_ALLOWED' });
  });

  it('blocks IPv6 loopback (::1)', async () => {
    setDnsLookup(mockDns('::1', 6));
    await expect(fetchUrl('http://ip6-localhost/page')).rejects.toMatchObject({ code: 'URL_NOT_ALLOWED' });
  });

  it('allows a public IP', async () => {
    setDnsLookup(mockDns('93.184.216.34')); // example.com
    nock('http://example.com')
      .get('/page')
      .reply(200, '<html><head><title>Test</title></head><body><p>' + 'x'.repeat(300) + '</p></body></html>', {
        'Content-Type': 'text/html',
      });
    const result = await fetchUrl('http://example.com/page');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('rejects non-http schemes', async () => {
    await expect(fetchUrl('ftp://example.com/file')).rejects.toMatchObject({ code: 'URL_NOT_ALLOWED' });
  });

  it('rejects URLs with credentials', async () => {
    await expect(fetchUrl('http://user:pass@example.com/')).rejects.toMatchObject({ code: 'URL_NOT_ALLOWED' });
  });

  it('rejects non-HTML content-type', async () => {
    setDnsLookup(mockDns('93.184.216.34'));
    nock('http://example.com').get('/file.pdf').reply(200, '%PDF-1.4', { 'Content-Type': 'application/pdf' });
    await expect(fetchUrl('http://example.com/file.pdf')).rejects.toMatchObject({ code: 'URL_NOT_ALLOWED' });
  });
});
