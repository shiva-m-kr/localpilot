import { ValidationFailedError } from '../errors.js';

export class SSRFValidator {
  private static readonly MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10MB limit

  // Blocked hostnames
  private static readonly BLOCKED_HOSTNAMES = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    '0.0.0.0',
    '169.254.169.254', // AWS/GCP Instance Metadata Service (IMDS)
    'metadata.google.internal',
    'instance-data'
  ]);

  /**
   * Validates target URL against SSRF attacks before initiating outbound HTTP requests.
   */
  static validateUrl(urlString: string): URL {
    let url: URL;
    try {
      url = new URL(urlString);
    } catch {
      throw new ValidationFailedError(`Invalid URL format: '${urlString}'.`);
    }

    // Scheme check: ONLY http and https permitted
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new ValidationFailedError(`Unsafe URL scheme '${url.protocol}'. Only HTTP and HTTPS are permitted.`);
    }

    const hostname = url.hostname.toLowerCase();

    // Loopback & Metadata host check
    if (this.BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      throw new ValidationFailedError(`Destination '${hostname}' is a forbidden private or metadata endpoint.`);
    }

    // IP range checks for private subnets
    if (this.isPrivateIpAddress(hostname)) {
      throw new ValidationFailedError(`Destination IP '${hostname}' belongs to a forbidden private network subnet.`);
    }

    return url;
  }

  /**
   * Evaluates HTTP redirect chains to prevent redirect bypass (e.g. public URL redirecting to 169.254.169.254).
   */
  static validateRedirect(originalUrl: string, redirectLocation: string): URL {
    const resolvedUrl = new URL(redirectLocation, originalUrl);
    return this.validateUrl(resolvedUrl.toString());
  }

  /**
   * Asserts that response content length does not exceed safety limits.
   */
  static assertSafeContentLength(contentLengthBytes: number): void {
    if (contentLengthBytes > this.MAX_RESPONSE_BYTES) {
      throw new ValidationFailedError(
        `Remote content size (${contentLengthBytes} bytes) exceeds maximum permitted limit (${this.MAX_RESPONSE_BYTES} bytes).`
      );
    }
  }

  private static isPrivateIpAddress(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) {
      return false; // Not a standard IPv4 dotted quad string
    }

    const [b1, b2] = parts;
    // 10.0.0.0/8
    if (b1 === 10) return true;
    // 172.16.0.0/12 (172.16 - 172.31)
    if (b1 === 172 && b2 >= 16 && b2 <= 31) return true;
    // 192.168.0.0/16
    if (b1 === 192 && b2 === 168) return true;
    // 127.0.0.0/8
    if (b1 === 127) return true;
    // 169.254.0.0/16 (Link-local)
    if (b1 === 169 && b2 === 254) return true;

    return false;
  }
}
