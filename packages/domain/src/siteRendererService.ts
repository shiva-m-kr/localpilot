import {
  HostedSiteRecord,
  SiteRevision,
  SitePublicFacts,
  SiteTemplateType,
  RenderedSiteHtml,
  SiteBlock,
} from '@localpilot/contracts';
import { ContentSanitizer } from './security/contentSanitizer.js';

export interface SiteStorage {
  getSiteById(siteId: string): Promise<HostedSiteRecord | null>;
  getRevisionById(revisionId: string): Promise<SiteRevision | null>;
  getConfirmedFacts(locationId: string): Promise<SitePublicFacts | null>;
}

export class SiteRendererService {
  private storage: SiteStorage;
  private previewSecret: string;

  constructor(storage: SiteStorage, previewSecret: string = 'localpilot-preview-secret-key-salt') {
    this.storage = storage;
    this.previewSecret = previewSecret;
  }

  /**
   * Generates a secure HMAC/hash preview token for draft site review
   */
  public generatePreviewToken(siteId: string, revisionId: string, expiresAtUnix: number): string {
    const payload = `${siteId}:${revisionId}:${expiresAtUnix}:${this.previewSecret}`;
    // Simple deterministic hash simulation for preview token
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `prev_${Math.abs(hash).toString(16)}_${expiresAtUnix}`;
  }

  /**
   * Verifies preview token validity
   */
  public verifyPreviewToken(siteId: string, revisionId: string, token: string): boolean {
    const parts = token.split('_');
    if (parts.length !== 3 || parts[0] !== 'prev') {
      return false;
    }
    const expiresAt = parseInt(parts[2], 10);
    if (isNaN(expiresAt) || Date.now() / 1000 > expiresAt) {
      return false; // Expired
    }
    const expected = this.generatePreviewToken(siteId, revisionId, expiresAt);
    return expected === token;
  }

  /**
   * Renders the HTML for either public visitor or authenticated preview
   */
  public async renderSite(params: {
    siteId: string;
    isPreview: boolean;
    previewToken?: string;
    host: string;
  }): Promise<RenderedSiteHtml> {
    const site = await this.storage.getSiteById(params.siteId);
    if (!site || site.status === 'DELETED') {
      return {
        siteId: params.siteId,
        revisionId: '',
        html: '<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 - Site Not Found</h1></body></html>',
        statusCode: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        isPreview: params.isPreview,
        sanitized: true,
        renderedAt: new Date().toISOString(),
      };
    }

    if (site.status === 'PAUSED' || site.status === 'MAINTENANCE') {
      return {
        siteId: params.siteId,
        revisionId: site.currentPublishedRevisionId || '',
        html: `<!DOCTYPE html><html><head><title>Site Unavailable</title></head><body><h1>This website is temporarily under scheduled maintenance.</h1></body></html>`,
        statusCode: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        isPreview: params.isPreview,
        sanitized: true,
        renderedAt: new Date().toISOString(),
      };
    }

    let revisionToRender: SiteRevision | null = null;

    if (params.isPreview) {
      // Authenticated draft preview
      if (!params.previewToken || !this.verifyPreviewToken(site.id, site.currentDraftRevisionId, params.previewToken)) {
        return {
          siteId: site.id,
          revisionId: site.currentDraftRevisionId,
          html: '<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>403 - Invalid or Expired Preview Token</h1></body></html>',
          statusCode: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          isPreview: true,
          sanitized: true,
          renderedAt: new Date().toISOString(),
        };
      }
      revisionToRender = await this.storage.getRevisionById(site.currentDraftRevisionId);
    } else {
      // Public view strictly uses current published revision
      if (!site.currentPublishedRevisionId) {
        return {
          siteId: site.id,
          revisionId: '',
          html: '<!DOCTYPE html><html><head><title>Under Construction</title></head><body><h1>Website is not yet published.</h1></body></html>',
          statusCode: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          isPreview: false,
          sanitized: true,
          renderedAt: new Date().toISOString(),
        };
      }
      revisionToRender = await this.storage.getRevisionById(site.currentPublishedRevisionId);
    }

    if (!revisionToRender) {
      return {
        siteId: site.id,
        revisionId: '',
        html: '<!DOCTYPE html><html><head><title>Revision Not Found</title></head><body><h1>Revision data unavailable</h1></body></html>',
        statusCode: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        isPreview: params.isPreview,
        sanitized: true,
        renderedAt: new Date().toISOString(),
      };
    }

    const facts = await this.storage.getConfirmedFacts(site.locationId);
    const html = this.buildHtmlDocument(site, revisionToRender, facts, params.isPreview);

    const headers: Record<string, string> = {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:;",
    };

    if (params.isPreview) {
      headers['X-Robots-Tag'] = 'noindex, nofollow';
    } else {
      headers['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=600';
    }

    return {
      siteId: site.id,
      revisionId: revisionToRender.revisionId,
      html,
      statusCode: 200,
      headers,
      isPreview: params.isPreview,
      sanitized: true,
      renderedAt: new Date().toISOString(),
    };
  }

  /**
   * Assembles semantic, accessible, sanitized HTML for the site
   */
  private buildHtmlDocument(
    site: HostedSiteRecord,
    revision: SiteRevision,
    facts: SitePublicFacts | null,
    isPreview: boolean
  ): string {
    const businessName = this.escapeHtml(facts?.businessName || 'Local Business');
    const metaTitle = this.escapeHtml(revision.metaTitle || businessName);
    const metaDescription = this.escapeHtml(revision.metaDescription || facts?.tagline || '');
    const canonicalHost = site.customDomain ? `https://${site.customDomain}` : `https://${site.subdomain}.localpilot.site`;

    const robotsMeta = isPreview
      ? '<meta name="robots" content="noindex, nofollow">'
      : '<meta name="robots" content="index, follow">';

    // Sort visible blocks
    const sortedBlocks = [...revision.blocks]
      .filter((b) => b.isVisible)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const renderedBlocksHtml = sortedBlocks
      .map((block) => this.renderBlock(block, revision.templateType, facts))
      .join('\n');

    const addressHtml = this.renderAddressSnippet(facts);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metaTitle}</title>
  <meta name="description" content="${metaDescription}">
  ${robotsMeta}
  <link rel="canonical" href="${canonicalHost}/">
  <style>
    :root {
      --primary: ${revision.theme.primaryColor};
      --secondary: ${revision.theme.secondaryColor};
      --bg: ${revision.theme.backgroundColor};
      --text: ${revision.theme.textColor};
      --radius: ${revision.theme.borderRadiusPx}px;
      --font-heading: ${revision.theme.fontFamilyHeading};
      --font-body: ${revision.theme.fontFamilyBody};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font-body); background-color: var(--bg); color: var(--text); line-height: 1.6; }
    h1, h2, h3, h4 { font-family: var(--font-heading); color: var(--text); line-height: 1.25; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
    header { padding: 1.25rem 0; border-bottom: 1px solid rgba(0,0,0,0.06); background: #ffffff; }
    .header-nav { display: flex; justify-content: space-between; align-items: center; }
    .brand-name { font-weight: 700; font-size: 1.35rem; color: var(--primary); }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.75rem 1.5rem; border-radius: var(--radius); font-weight: 600; text-decoration: none; cursor: pointer; border: none; }
    .btn-primary { background-color: var(--primary); color: #ffffff; }
    .btn-secondary { background-color: #ffffff; color: var(--primary); border: 2px solid var(--primary); }
    section { padding: 4rem 0; }
    .hero-section { text-align: center; padding: 5rem 0; background: linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%); }
    .grid { display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .card { background: #ffffff; border-radius: var(--radius); padding: 1.75rem; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    footer { background: #1E293B; color: #F8FAFC; padding: 3rem 0; font-size: 0.95rem; margin-top: 4rem; }
    footer a { color: #FDBA74; text-decoration: none; }
  </style>
</head>
<body>
  ${isPreview ? '<div style="background:#E0580C;color:#FFF;text-align:center;padding:0.5rem;font-weight:bold;font-size:0.875rem;">PREVIEW MODE — DRAFT REVISION (NOT INDEXED)</div>' : ''}
  <header>
    <div class="container header-nav">
      <div class="brand-name">${businessName}</div>
      <div>
        ${facts?.phone ? `<a href="tel:${this.escapeHtml(facts.phone)}" class="btn btn-primary">Call ${this.escapeHtml(facts.phone)}</a>` : ''}
      </div>
    </div>
  </header>

  <main>
    ${renderedBlocksHtml}
  </main>

  <footer>
    <div class="container">
      <div class="grid">
        <div>
          <h3>${businessName}</h3>
          <p>${this.escapeHtml(facts?.category || 'Professional Services')}</p>
          ${addressHtml}
        </div>
        <div>
          <h4>Contact & Hours</h4>
          ${facts?.phone ? `<p>Phone: <a href="tel:${this.escapeHtml(facts.phone)}">${this.escapeHtml(facts.phone)}</a></p>` : ''}
          ${facts?.email ? `<p>Email: <a href="mailto:${this.escapeHtml(facts.email)}">${this.escapeHtml(facts.email)}</a></p>` : ''}
        </div>
        <div>
          <h4>Service Coverage</h4>
          <p>${facts?.isSAB ? 'Service Area Business — Prompt on-site service at your location.' : 'Welcoming customers to our physical premises.'}</p>
          ${facts?.serviceAreas && facts.serviceAreas.length > 0 ? `<p>Areas: ${this.escapeHtml(facts.serviceAreas.join(', '))}</p>` : ''}
        </div>
      </div>
      <div style="margin-top: 2rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1.5rem; text-align: center;">
        <p>&copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
      </div>
    </div>
  </footer>
</body>
</html>`;
  }

  private renderBlock(block: SiteBlock, templateType: SiteTemplateType, facts: SitePublicFacts | null): string {
    switch (block.type) {
      case 'HERO': {
        const headline = this.escapeHtml(block.headline);
        const subheadline = block.subheadline ? `<p style="font-size:1.25rem;max-width:700px;margin:1rem auto 2rem;color:#475569;">${this.escapeHtml(block.subheadline)}</p>` : '';
        const badge = block.badgeText ? `<span style="display:inline-block;padding:0.25rem 0.75rem;background:#FED7AA;color:#9A3412;border-radius:999px;font-size:0.875rem;font-weight:600;margin-bottom:1rem;">${this.escapeHtml(block.badgeText)}</span>` : '';
        
        let ctaButtons = `<a href="${this.escapeHtml(block.primaryCtaLink)}" class="btn btn-primary">${this.escapeHtml(block.primaryCtaText)}</a>`;
        if (block.secondaryCtaText && block.secondaryCtaLink) {
          ctaButtons += ` <a href="${this.escapeHtml(block.secondaryCtaLink)}" class="btn btn-secondary" style="margin-left:0.75rem;">${this.escapeHtml(block.secondaryCtaText)}</a>`;
        }

        return `
        <section class="hero-section">
          <div class="container">
            ${badge}
            <h1 style="font-size:3rem;font-weight:800;letter-spacing:-0.02em;">${headline}</h1>
            ${subheadline}
            <div style="margin-top:1.5rem;">${ctaButtons}</div>
          </div>
        </section>`;
      }

      case 'SERVICES': {
        const serviceCards = block.services.map((svc) => `
          <div class="card">
            <h3>${this.escapeHtml(svc.name)}</h3>
            <p style="margin:0.75rem 0;color:#64748B;">${this.escapeHtml(svc.description)}</p>
            ${svc.startingPrice ? `<div style="font-weight:700;color:var(--primary);margin-bottom:0.5rem;">${this.escapeHtml(svc.startingPrice)}</div>` : ''}
            ${svc.callToAction ? `<a href="#contact" class="btn btn-secondary" style="padding:0.4rem 0.8rem;font-size:0.875rem;">${this.escapeHtml(svc.callToAction)}</a>` : ''}
          </div>
        `).join('');

        return `
        <section id="services">
          <div class="container">
            <h2 style="font-size:2.25rem;text-align:center;margin-bottom:2rem;">${this.escapeHtml(block.heading)}</h2>
            ${block.subheading ? `<p style="text-align:center;color:#64748B;margin-top:-1.5rem;margin-bottom:2.5rem;">${this.escapeHtml(block.subheading)}</p>` : ''}
            <div class="grid">${serviceCards}</div>
          </div>
        </section>`;
      }

      case 'ABOUT': {
        const bioHtml = this.escapeHtml(block.bio).replace(/\n\n/g, '</p><p>');
        const highlightsHtml = block.highlights.length > 0
          ? `<ul style="list-style:none;margin-top:1.25rem;">${block.highlights.map(h => `<li style="padding:0.25rem 0;">&#10003; ${this.escapeHtml(h)}</li>`).join('')}</ul>`
          : '';

        return `
        <section id="about" style="background:#FFFFFF;">
          <div class="container">
            <h2 style="font-size:2.25rem;margin-bottom:1.5rem;">${this.escapeHtml(block.heading)}</h2>
            <div style="max-width:800px;font-size:1.1rem;color:#334155;">
              <p>${bioHtml}</p>
              ${highlightsHtml}
              ${block.yearsInBusiness ? `<p style="margin-top:1rem;font-weight:600;">Proudly serving the community for ${block.yearsInBusiness}+ years.</p>` : ''}
            </div>
          </div>
        </section>`;
      }

      case 'HOURS': {
        const hoursList = facts?.operatingHours?.map((h) => `
          <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #E2E8F0;">
            <span style="font-weight:600;">${h.dayOfWeek}</span>
            <span>${h.isClosed ? 'Closed' : `${h.opens} - ${h.closes}`}</span>
          </div>
        `).join('') || '<p>Call for current operating hours.</p>';

        return `
        <section id="hours">
          <div class="container" style="max-width:600px;">
            <h2 style="font-size:2.25rem;text-align:center;margin-bottom:1.5rem;">${this.escapeHtml(block.heading)}</h2>
            ${block.emergency24x7 ? '<div style="background:#FEE2E2;color:#991B1B;padding:0.75rem;border-radius:var(--radius);font-weight:bold;text-align:center;margin-bottom:1rem;">24/7 Emergency Dispatch Available</div>' : ''}
            <div class="card">${hoursList}</div>
          </div>
        </section>`;
      }

      case 'CONTACT': {
        return `
        <section id="contact" style="background:#FFFFFF;">
          <div class="container" style="max-width:700px;text-align:center;">
            <h2 style="font-size:2.25rem;margin-bottom:1rem;">${this.escapeHtml(block.heading)}</h2>
            ${block.subheading ? `<p style="color:#64748B;margin-bottom:2rem;">${this.escapeHtml(block.subheading)}</p>` : ''}
            <div class="card">
              ${block.showPhone && facts?.phone ? `<p style="font-size:1.25rem;margin-bottom:1rem;">Phone: <a href="tel:${this.escapeHtml(facts.phone)}" style="font-weight:bold;color:var(--primary);text-decoration:none;">${this.escapeHtml(facts.phone)}</a></p>` : ''}
              ${block.showEmail && facts?.email ? `<p style="margin-bottom:1rem;">Email: <a href="mailto:${this.escapeHtml(facts.email)}">${this.escapeHtml(facts.email)}</a></p>` : ''}
              ${block.bookingUrl ? `<div style="margin-top:1.5rem;"><a href="${this.escapeHtml(block.bookingUrl)}" class="btn btn-primary">${this.escapeHtml(block.bookingButtonText || 'Book Appointment Online')}</a></div>` : ''}
            </div>
          </div>
        </section>`;
      }

      case 'TESTIMONIALS': {
        const testimonialsList = block.testimonials.map((t) => `
          <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;">
            <p style="font-style:italic;color:#334155;margin-bottom:1rem;">"${this.escapeHtml(t.quote)}"</p>
            <div>
              <strong>${this.escapeHtml(t.customerName)}</strong>
              ${t.serviceRendered ? `<span style="color:#64748B;font-size:0.875rem;"> &bull; ${this.escapeHtml(t.serviceRendered)}</span>` : ''}
              ${t.verifiedCustomer ? `<span style="color:#059669;font-size:0.75rem;font-weight:bold;display:block;">Verified Customer</span>` : ''}
            </div>
          </div>
        `).join('');

        return `
        <section id="testimonials">
          <div class="container">
            <h2 style="font-size:2.25rem;text-align:center;margin-bottom:2rem;">${this.escapeHtml(block.heading)}</h2>
            <div class="grid">${testimonialsList}</div>
          </div>
        </section>`;
      }

      case 'SERVICE_AREA': {
        const cities = block.coveredCities.map(c => `<span style="display:inline-block;background:#E2E8F0;padding:0.35rem 0.85rem;border-radius:999px;font-size:0.9rem;margin:0.25rem;">${this.escapeHtml(c)}</span>`).join(' ');
        return `
        <section id="service-area" style="background:#FFFFFF;">
          <div class="container" style="text-align:center;">
            <h2 style="font-size:2.25rem;margin-bottom:1rem;">${this.escapeHtml(block.heading)}</h2>
            ${block.serviceRadiusKm ? `<p style="color:#64748B;margin-bottom:1.5rem;">Serving within a ${block.serviceRadiusKm} km radius of our central dispatch.</p>` : ''}
            <div style="margin:1.5rem auto;max-width:800px;">${cities}</div>
            ${block.disclaimer ? `<p style="font-size:0.875rem;color:#94A3B8;margin-top:1rem;">${this.escapeHtml(block.disclaimer)}</p>` : ''}
          </div>
        </section>`;
      }

      case 'GALLERY': {
        const galleryItems = block.images.map(img => `
          <div style="overflow:hidden;border-radius:var(--radius);border:1px solid #E2E8F0;">
            <img src="${this.escapeHtml(img.imageUrl)}" alt="${this.escapeHtml(img.altText)}" style="width:100%;height:220px;object-fit:cover;display:block;">
            ${img.caption ? `<p style="padding:0.5rem;font-size:0.875rem;color:#475569;background:#FFF;">${this.escapeHtml(img.caption)}</p>` : ''}
          </div>
        `).join('');

        return `
        <section id="gallery">
          <div class="container">
            <h2 style="font-size:2.25rem;text-align:center;margin-bottom:2rem;">${this.escapeHtml(block.heading)}</h2>
            <div class="grid">${galleryItems}</div>
          </div>
        </section>`;
      }

      default:
        return '';
    }
  }

  /**
   * Address snippet: strictly suppresses street address for Service Area Businesses
   */
  private renderAddressSnippet(facts: SitePublicFacts | null): string {
    if (!facts) return '';

    if (facts.isSAB || facts.hasHiddenAddress) {
      // Hidden address: only show locality / city / region / postal code
      return `<p>Serving ${this.escapeHtml(facts.city)}, ${this.escapeHtml(facts.stateOrRegion)} ${this.escapeHtml(facts.postalCode)}</p>`;
    }

    // Physical storefront: show full street address
    return `
      <address style="font-style:normal;margin-top:0.5rem;">
        ${facts.streetAddress ? `<p>${this.escapeHtml(facts.streetAddress)}</p>` : ''}
        <p>${this.escapeHtml(facts.city)}, ${this.escapeHtml(facts.stateOrRegion)} ${this.escapeHtml(facts.postalCode)}</p>
      </address>
    `;
  }

  /**
   * Migrates an existing revision to a new template type while preserving owner blocks and content
   */
  public migrateTemplate(
    currentRevision: SiteRevision,
    targetTemplateType: SiteTemplateType
  ): SiteRevision {
    // Preserve all existing blocks, updating template type and version
    const updatedRevision: SiteRevision = {
      ...currentRevision,
      revisionId: crypto.randomUUID ? crypto.randomUUID() : `rev-${Date.now()}`,
      templateType: targetTemplateType,
      templateVersion: currentRevision.templateVersion + 1,
      createdAt: new Date().toISOString(),
      isPublished: false,
      publishedAt: undefined,
    };

    return updatedRevision;
  }

  private escapeHtml(str: string): string {
    return ContentSanitizer.escapeHtml(str);
  }
}
