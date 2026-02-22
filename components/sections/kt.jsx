// components/sections/kt.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, Button, Callout, Spinner } from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const RSSHUB_BASE = 'https://myrhub.vercel.app/kenyatronics/view/';

export const KtPanel = observer(({ store }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const scrapeKtProduct = async () => {
    if (!url.trim() || !url.includes('kenyatronics.com/view-product/')) {
      setError('Please enter a valid Kenyatronics product URL');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const slugMatch = url.match(/\/view-product\/([^/]+)/);
      const slug = slugMatch?.[1] || '';
      if (!slug) throw new Error('Could not extract product slug');

      const jsonUrl = `${RSSHUB_BASE}${slug}?format=json`;
      const proxyUrl = CORS_PROXY + encodeURIComponent(jsonUrl);

      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`RSSHub error ${res.status}`);

      const json = await res.json();

      const item = json.items?.[0];
      if (!item) throw new Error('No product item found');

      const title = item.title || 'Product';

      let contentData = {};
      try {
        const contentStr = item.content_html || '{}';
        contentData = JSON.parse(contentStr);
      } catch (e) {
        console.warn('Failed to parse content_html:', e);
      }

      const name = contentData.name || title;
      const price = contentData.price ? `KSh ${contentData.price}` : 'Price not found';
      const ram = contentData.ram || 'N/A';
      const rom = contentData.rom || 'N/A';

      let images = contentData.images || [];

      if (images.length === 0) {
        item.tags?.forEach(tag => {
          if (tag.startsWith('https://wsrv.nl/?url=')) {
            images.push(tag);
          }
        });
      }

      const data = {
        name,
        price,
        spec1: `RAM: ${ram}`,
        spec2: `ROM: ${rom}`,
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

    // Small delay to ensure Polotno is ready after any async load
    setTimeout(() => {
      const page = store.activePage;

      let updatedCount = 0;

      page.children.forEach(el => {
        if (el.type === 'text') {
          let currentText = (el.text || '').trim();
          let newText = currentText;

          // Case-insensitive + trim-safe replacement
          newText = newText.replace(/\{\{name}}/gi, result.name?.trim() || '');
          newText = newText.replace(/\{\{price}}/gi, result.price?.trim() || '');
          newText = newText.replace(/\{\{spec1}}/gi, result.spec1?.trim() || '');
          newText = newText.replace(/\{\{spec2}}/gi, result.spec2?.trim() || '');

          if (newText !== currentText) {
            el.set({ text: newText });
            updatedCount++;
            console.log('Updated text element:', { old: currentText, new: newText });
          }
        }

        if (el.type === 'image') {
          const match = el.name?.match(/image(\d+)/i);
          if (match) {
            const index = parseInt(match[1], 10) - 1;
            if (result.images[index]) {
              // Force rotation reset + set new src
              el.set({
                src: result.images[index],
                rotation: 0  // ← fixes rotated images
              });
              updatedCount++;
              console.log('Updated image element:', { name: el.name, src: result.images[index] });
            }
          }
        }
      });

      if (updatedCount > 0) {
        alert(`Success! ${updatedCount} elements updated (name, price, specs, images).`);
      } else {
        alert('No placeholders found to replace. Check element names/text.');
      }
    }, 200); // 200ms delay — adjust to 500 if still not updating
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3>Kenyatronics Poster Generator</h3>
      <p style={{ marginBottom: 16, color: '#aaa', fontSize: '14px' }}>
        Paste full Kenyatronics product URL to auto-fill your template.
      </p>

      <InputGroup
        large
        leftIcon="globe-network"
        placeholder="https://kenyatronics.com/view-product/..."
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
        {loading ? 'Loading...' : 'Load & Fill Template'}
      </Button>

      {error && (
        <Callout intent="danger" style={{ marginTop: 16 }}>
          {error}
        </Callout>
      )}

      {result && (
        <div style={{ marginTop: 24, flex: 1, overflowY: 'auto' }}>
          <Callout intent="success" title="Product Loaded">
            <strong>{result.name}</strong><br />
            <strong style={{ color: '#00ff9d' }}>{result.price}</strong><br /><br />
            {result.spec1} • {result.spec2}<br /><br />
            <strong>Images ready:</strong> {result.images.length}
          </Callout>

          <Button
            large
            intent="success"
            onClick={fillCanvas}
            style={{ marginTop: 20, width: '100%' }}
          >
            Fill Current Canvas
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
