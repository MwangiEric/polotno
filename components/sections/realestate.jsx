// components/sections/realestate.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, Button, Callout, Spinner, FormGroup } from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';

export const RealEstatePanel = observer(({ store }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const scrapeListing = async () => {
    if (!url.trim() || !url.includes('danco.co.ke/listing/')) {
      setError('Please enter a valid Danco.co.ke listing URL');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const proxyUrl = CORS_PROXY + encodeURIComponent(url.trim());
      const res = await fetch(proxyUrl, {
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!res.ok) {
        throw new Error(`Proxy error ${res.status}`);
      }

      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Title - multiple possible selectors
      const titleEl = doc.querySelector('h1.page-title, h1.listing-title, h1[itemprop="name"], .title h1');
      const title = titleEl?.textContent?.trim() || 'Property Listing';

      // Price
      const priceEl = doc.querySelector('.price, .listing-price, [itemprop="price"], .price-tag');
      const price = priceEl?.textContent?.trim() || 'Price on request';

      // Description
      const descEl = doc.querySelector('.property-description, .listing-description, [itemprop="description"], .description');
      const description = descEl?.textContent?.trim() || '';

      // Details (beds, baths, size, etc.)
      const details = {};
      doc.querySelectorAll('.property-detail-item, .detail-item, .listing-specs li, .specs li, .feature').forEach(item => {
        const label = item.querySelector('.label, .key, dt, strong, .spec-label')?.textContent?.trim()?.toLowerCase();
        const value = item.querySelector('.value, .val, dd, span, .spec-value')?.textContent?.trim();
        if (label && value) {
          details[label] = value;
        }
      });

      // Features / amenities
      const features = [];
      doc.querySelectorAll('.feature-item, .amenity-item, .features-list li, .amenities li, .listing-features li').forEach(li => {
        const text = li.textContent?.trim();
        if (text) features.push(text);
      });

      // Images - try many selectors + data-src fallback
      const images = [];
      const imgSelectors = [
        '.main-image img', '.featured-image img', '.primary-photo img',
        '.gallery img', '.thumbnails img', '.slider img', '.photos img',
        '[itemprop="image"]', '.listing-photos img'
      ];

      imgSelectors.forEach(sel => {
        doc.querySelectorAll(sel).forEach(img => {
          let src = img.src || img.dataset.src || img.getAttribute('data-lazy') || img.getAttribute('data-original');
          if (src && !src.startsWith('data:') && !images.some(u => u.includes(src))) {
            images.push(CORS_PROXY + encodeURIComponent(src));
          }
        });
      });

      const data = {
        title,
        price,
        bedrooms: details.bedrooms || details['bed rooms'] || details.beds || 'N/A',
        bathrooms: details.bathrooms || details['bath rooms'] || details.baths || 'N/A',
        area: details.area || details.size || details['size (sqft)'] || details['size (m²)'] || 'N/A',
        description: description.substring(0, 450) + (description.length > 450 ? '...' : ''),
        features: features.slice(0, 12),
        images: images.slice(0, 8)
      };

      setResult(data);
    } catch (err) {
      console.error('Scrape error:', err);
      setError('Could not load the listing. The site may have changed layout, blocked the proxy, or the URL is invalid.');
    } finally {
      setLoading(false);
    }
  };

  const fillCanvas = () => {
    if (!result) return;

    const page = store.activePage;

    // Title
    page.addElement({
      type: 'text',
      text: result.title,
      x: 60,
      y: 40,
      width: 960,
      fontSize: 52,
      fontFamily: 'Arial',
      fill: '#ffffff',
      align: 'center'
    });

    // Price
    page.addElement({
      type: 'text',
      text: result.price,
      x: 60,
      y: 140,
      width: 960,
      fontSize: 72,
      fontFamily: 'Arial',
      fill: '#00ff9d',
      align: 'center'
    });

    // Beds • Baths • Area
    page.addElement({
      type: 'text',
      text: `${result.bedrooms} Bed • ${result.bathrooms} Bath • ${result.area}`,
      x: 60,
      y: 260,
      width: 960,
      fontSize: 38,
      fill: '#cccccc',
      align: 'center'
    });

    // Main image (first one)
    if (result.images[0]) {
      page.addElement({
        type: 'image',
        src: result.images[0],
        x: 0,
        y: 360,
        width: 1080,
        height: 1080
      });
    }

    // Short description
    page.addElement({
      type: 'text',
      text: result.description,
      x: 60,
      y: 1480,
      width: 960,
      fontSize: 28,
      lineHeight: 1.5,
      fill: '#dddddd'
    });

    // Features bullets
    result.features.forEach((feat, i) => {
      page.addElement({
        type: 'text',
        text: `• ${feat}`,
        x: 80,
        y: 1580 + i * 45,
        width: 920,
        fontSize: 26,
        fill: '#aaffcc'
      });
    });

    alert('Listing data added to canvas!\nNow edit, reposition, add logo, contact info, etc.');
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3>Real Estate Poster Generator</h3>
      <p style={{ marginBottom: 16, color: '#aaa', fontSize: '14px' }}>
        Paste a full Danco.co.ke listing URL to auto-extract data and fill poster.
      </p>

      <InputGroup
        large
        leftIcon="globe-network"
        placeholder="https://danco.co.ke/listing/..."
        value={url}
        onChange={e => setUrl(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <Button
        large
        intent="primary"
        onClick={scrapeListing}
        loading={loading}
        disabled={loading || !url.trim()}
      >
        {loading ? 'Scraping...' : 'Load & Fill Listing'}
      </Button>

      {error && (
        <Callout intent="danger" style={{ marginTop: 16 }}>
          {error}
        </Callout>
      )}

      {result && (
        <div style={{ marginTop: 24, flex: 1, overflowY: 'auto' }}>
          <Callout intent="success" title="Listing Loaded Successfully">
            <strong>{result.title}</strong><br />
            <strong style={{ color: '#00ff9d' }}>{result.price}</strong><br /><br />
            {result.bedrooms} Bed • {result.bathrooms} Bath • {result.area}<br /><br />
            <strong>Features extracted:</strong> {result.features.length}<br />
            <strong>Images found:</strong> {result.images.length}
          </Callout>

          <Button
            large
            intent="success"
            onClick={fillCanvas}
            style={{ marginTop: 20, width: '100%' }}
          >
            Fill Current Canvas Now
          </Button>
        </div>
      )}
    </div>
  );
});

export const RealEstateSection = {
  name: 'realestate',
  Tab: (props) => (
    <SectionTab name="Real Estate" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </SectionTab>
  ),
  Panel: RealEstatePanel,
};
