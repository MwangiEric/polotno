// components/sections/kt.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, Button, Callout, Spinner } from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const WSRV = 'https://wsrv.nl/?url=';

export const KtPanel = observer(({ store }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const scrapeKtProduct = async () => {
    if (!url.trim() || !url.includes('myrhub.vercel.app/kenyatronics/view/')) {
      setError('Please enter a valid Kenyatronics RSS URL');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const proxyUrl = CORS_PROXY + encodeURIComponent(url.trim());
      const res = await fetch(proxyUrl);

      if (!res.ok) {
        throw new Error(`Proxy error ${res.status}`);
      }

      const xmlText = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');

      const item = doc.querySelector('item');
      if (!item) throw new Error('No product item found in RSS');

      const title = item.querySelector('title')?.textContent?.trim() || 'Product';
      const description = item.querySelector('description')?.textContent?.trim() || '';
      const link = item.querySelector('link')?.textContent?.trim() || '';

      let price = 'Price not found';
      let ram = 'N/A';
      let rom = 'N/A';

      if (description.includes('Price:')) {
        const parts = description.split('|').map(p => p.trim());
        price = parts.find(p => p.includes('Price:')) || price;
        ram = parts.find(p => p.includes('RAM:')) || ram;
        rom = parts.find(p => p.includes('ROM:')) || rom;
      }

      // Images from <category> tags – route through wsrv.nl
      const images = [];
      item.querySelectorAll('category').forEach(cat => {
        let src = cat.textContent?.trim();
        if (src?.startsWith('https://wsrv.nl/?url=')) {
          const match = src.match(/url=(https[^&]+)/);
          if (match?.[1]) {
            const original = decodeURIComponent(match[1]);
            // Use wsrv with fixed size & style
            src = `${WSRV}${encodeURIComponent(original)}&w=800&h=800&fit=contain&bg=white`;
            images.push(src);
          }
        } else if (src?.startsWith('http')) {
          // Fallback: also proxy original images
          images.push(`${WSRV}${encodeURIComponent(src)}&w=800&h=800&fit=contain&bg=white`);
        }
      });

      const data = {
        title,
        price,
        ram,
        rom,
        description,
        link,
        images: images.slice(0, 6)
      };

      setResult(data);
    } catch (err) {
      console.error('KT scrape error:', err);
      setError('Could not load product. Check URL or try again.');
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
      fontSize: 48,
      fontFamily: 'Arial',
      fill: '#ffffff',
      align: 'center'
    });

    // Price (big & green highlight)
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

    // Specs (RAM / ROM)
    page.addElement({
      type: 'text',
      text: `${result.ram} • ${result.rom}`,
      x: 60,
      y: 260,
      width: 960,
      fontSize: 38,
      fill: '#cccccc',
      align: 'center'
    });

    // Main product image (first one)
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

    // Short description or link
    page.addElement({
      type: 'text',
      text: result.description || result.link || 'View full details online',
      x: 60,
      y: 1480,
      width: 960,
      fontSize: 28,
      lineHeight: 1.5,
      fill: '#dddddd'
    });

    // Small gallery thumbnails (bottom row)
    result.images.slice(1, 5).forEach((imgUrl, i) => {
      page.addElement({
        type: 'image',
        src: imgUrl,
        x: 100 + i * 220,
        y: 1680,
        width: 180,
        height: 180,
        keepRatio: true,
        name: `gallery-thumb-${i}`
      });
    });

    alert('Kenyatronics product poster generated!\nCustomize layout, add logo, price badge, etc.');
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3>Kenyatronics Product Poster</h3>
      <p style={{ marginBottom: 16, color: '#aaa', fontSize: '14px' }}>
        Paste a Kenyatronics RSS URL to auto-create product poster.
      </p>

      <InputGroup
        large
        leftIcon="globe-network"
        placeholder="https://myrhub.vercel.app/kenyatronics/view/iphone-12-pro..."
        value={url}
        onChange={e => setUrl(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <Button
        large
        intent="primary"
        onClick={scrapeKtProduct}
        loading={loading}
        disabled={loading || !url.trim()}
      >
        {loading ? 'Loading...' : 'Load & Generate Poster'}
      </Button>

      {error && (
        <Callout intent="danger" style={{ marginTop: 16 }}>
          {error}
        </Callout>
      )}

      {result && (
        <div style={{ marginTop: 24, flex: 1, overflowY: 'auto' }}>
          <Callout intent="success" title="Product Loaded">
            <strong>{result.title}</strong><br />
            <strong style={{ color: '#00ff9d' }}>{result.price}</strong><br /><br />
            {result.ram} • {result.rom}<br /><br />
            <strong>Images ready:</strong> {result.images.length}
          </Callout>

          <Button
            large
            intent="success"
            onClick={fillCanvas}
            style={{ marginTop: 20, width: '100%' }}
          >
            Fill Canvas with Poster
          </Button>
        </div>
      )}
    </div>
  );
});

export const KtSection = {
  name: 'kt',
  Tab: (props) => (
    <SectionTab name="KT" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </SectionTab>
  ),
  Panel: KtPanel,
};
