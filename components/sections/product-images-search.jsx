// components/sections/product-images-search.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, Button, Callout, Spinner, Tag, Checkbox } from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const SEARXNG_BASE = 'https://far-paule-emw-a67bd497.koyeb.app/search';
const WSRV = 'https://wsrv.nl/?url=';

// Enhancement text (appended when checkbox is on)
const ENHANCED_QUERY = 'transparent PNG product cutout official OR white background OR isolated';

export const ProductImagesSearchPanel = observer(({ store }) => {
  const [query, setQuery] = useState('');
  const [useEnhanced, setUseEnhanced] = useState(true); // default: enhanced on
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState([]); // { url, isTransparent }

  const searchImages = async () => {
    const q = query.trim();
    if (!q) {
      setError('Enter a product name to search');
      return;
    }

    setLoading(true);
    setError('');
    setImages([]);

    try {
      // Build query
      let searchQuery = q;
      if (useEnhanced) {
        searchQuery += ` ${ENHANCED_QUERY}`;
      }
      searchQuery = searchQuery.trim();

      const searchUrl = `${SEARXNG_BASE}?q=${encodeURIComponent(searchQuery)}&format=json&categories=images&safesearch=1`;
      const proxyUrl = `${CORS_PROXY}${encodeURIComponent(searchUrl)}`;

      console.log('Fetching from proxy:', proxyUrl); // debug

      const res = await fetch(proxyUrl);
      if (!res.ok) {
        const text = await res.text();
        console.error('Proxy response:', res.status, text);
        throw new Error(`SearXNG error ${res.status}`);
      }

      const data = await res.json();
      const results = data.results || [];

      // Get candidate images
      const candidates = results
        .filter(r => r.img_src && r.img_src.startsWith('http') && !r.img_src.includes('base64'))
        .map(r => r.img_src)
        .slice(0, 20); // enough to analyze

      // Analyze transparency
      const analyzed = [];
      for (const src of candidates) {
        try {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.src = CORS_PROXY + encodeURIComponent(src);
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const tl = ctx.getImageData(0, 0, 1, 1).data;
          const tr = ctx.getImageData(canvas.width - 1, 0, 1, 1).data;
          const isTransparent = tl[3] === 0 || tr[3] === 0;

          // Clean wsrv wrapper
          let wsrvUrl = `${WSRV}${encodeURIComponent(src)}&w=800&h=800&fit=contain&output=png`;
          if (isTransparent) wsrvUrl += '&bg=transparent';

          analyzed.push({ url: wsrvUrl, isTransparent });
        } catch (e) {
          console.warn('Image analysis failed:', src);
        }
      }

      // Sort: transparent first
      analyzed.sort((a, b) => b.isTransparent - a.isTransparent);

      if (analyzed.length === 0) {
        setError('No usable product images found. Try a different name.');
      } else {
        setImages(analyzed);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search images. Check console or try again.');
    } finally {
      setLoading(false);
    }
  };

  const addImageToCanvas = (imageUrl) => {
    const page = store.activePage;
    const size = Math.min(store.width * 0.7, store.height * 0.7);

    page.addElement({
      type: 'image',
      src: imageUrl,
      x: (store.width - size) / 2,
      y: (store.height - size) / 2,
      width: size,
      height: size,
      keepRatio: true,
      rotation: 0,
      name: 'searched-product-image'
    });
  };

  const downloadImage = (imageUrl, index) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `product-image-${index + 1}.png`;
    link.click();
  };

  const addAllAsGallery = () => {
    const page = store.activePage;
    const size = 300;
    let x = 50;
    let y = 50;

    images.forEach((img, i) => {
      page.addElement({
        type: 'image',
        src: img.url,
        x,
        y,
        width: size,
        height: size,
        keepRatio: true,
        rotation: 0,
        name: `gallery-image-${i + 1}`
      });

      x += size + 20;
      if (x + size > store.width - 50) {
        x = 50;
        y += size + 20;
      }
    });

    alert('All images added as gallery!');
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3>Product Images Search</h3>
      <p style={{ marginBottom: 16, color: '#aaa', fontSize: '14px' }}>
        Type product name → search → click to add to canvas.
      </p>

      <InputGroup
        large
        leftIcon="search"
        placeholder="Samsung Galaxy S26 Ultra, OnePlus Buds 4, ..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ marginBottom: 8 }}
      />

      <Checkbox
        checked={useEnhanced}
        onChange={e => setUseEnhanced(e.target.checked)}
        label="Enhanced search (prefer transparent / clean images)"
        style={{ marginBottom: 16 }}
      />

      <Button
        large
        intent="primary"
        onClick={searchImages}
        loading={loading}
        disabled={loading || !query.trim()}
      >
        {loading ? 'Searching...' : 'Search Images'}
      </Button>

      {error && (
        <Callout intent="danger" style={{ marginTop: 16 }}>
          {error}
        </Callout>
      )}

      {images.length > 0 && (
        <div style={{ marginTop: 24, flex: 1, overflowY: 'auto' }}>
          <Callout intent="success" title={`${images.length} Images Found`}>
            <div style={{ marginBottom: 16 }}>
              <Button intent="success" onClick={addAllAsGallery} style={{ marginRight: 12 }}>
                Add All as Gallery
              </Button>
              <Tag intent="primary" minimal>
                Click image to add • Download button per image
              </Tag>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
              {images.map((img, i) => (
                <div
                  key={i}
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s',
                    border: img.isTransparent ? '2px solid #3EB489' : '1px solid #444'
                  }}
                  onClick={() => addImageToCanvas(img.url)}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <img
                    src={img.url}
                    alt={`Product image ${i + 1}`}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                    onError={e => e.target.src = 'https://via.placeholder.com/160?text=Error'}
                  />
                  <Tag
                    intent={img.isTransparent ? 'success' : 'default'}
                    minimal
                    style={{ position: 'absolute', top: 8, right: 8, fontSize: 10 }}
                  >
                    {img.isTransparent ? 'Transparent' : 'Solid BG'}
                  </Tag>
                  <Button
                    minimal
                    small
                    icon="download"
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      background: 'rgba(0,0,0,0.6)',
                      color: 'white'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(img.url, i);
                    }}
                  />
                </div>
              ))}
            </div>
          </Callout>
        </div>
      )}
    </div>
  );
});

export const ProductImagesSearchSection = {
  name: 'product-images-search',
  Tab: (props) => (
    <SectionTab name="Product Images Search" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </SectionTab>
  ),
  Panel: ProductImagesSearchPanel,
};
