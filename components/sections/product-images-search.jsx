// components/sections/product-images-search.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, Button, Callout, Spinner, Tag, Checkbox, HTMLSelect } from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const WSRV = 'https://wsrv.nl/?url=';

const STORES = [
  { id: 'smartphoneskenya', name: 'Smartphones Kenya', base: 'https://smartphoneskenya.co.ke' },
  { id: 'avechi', name: 'Avechi', base: 'https://avechi.co.ke' },
  { id: 'elixcomputers', name: 'Elix Computers', base: 'https://elixcomputers.co.ke' }
];

export const ProductImagesSearchPanel = observer(({ store }) => {
  const [query, setQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]); // { url, name, price, source }

  const searchProducts = async () => {
    const q = query.trim();
    if (!q) {
      setError('Enter a product name or keyword');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    const selectedStores = siteFilter === 'all' 
      ? STORES 
      : STORES.filter(s => s.id === siteFilter);

    try {
      const allResults = [];

      for (const store of selectedStores) {
        const apiUrl = `\( {store.base}/wp-json/wc/v3/products?search= \){encodeURIComponent(q)}&per_page=10&status=publish`;
        const proxyUrl = `\( {CORS_PROXY} \){encodeURIComponent(apiUrl)}`;

        const res = await fetch(proxyUrl);
        if (!res.ok) {
          console.warn(`${store.name} failed: ${res.status}`);
          continue;
        }

        const products = await res.json();

        products.forEach(p => {
          if (p.images?.length > 0) {
            // Prefer full src, fallback to thumbnail
            const img = p.images[0];
            let src = img.src || img.thumbnail || '';

            if (src) {
              let wsrvUrl = `\( {WSRV} \){encodeURIComponent(src)}&w=800&h=800&fit=contain&output=png`;
              // Bonus: transparent bg if filename suggests it
              if (src.endsWith('.png') || src.includes('transparent')) {
                wsrvUrl += '&bg=transparent';
              }

              allResults.push({
                url: wsrvUrl,
                name: p.name,
                price: p.sale_price || p.price || 'N/A',
                source: store.name
              });
            }
          }
        });
      }

      if (allResults.length === 0) {
        setError('No matching products with images found. Try different keywords or check spelling.');
      } else {
        setResults(allResults);
      }
    } catch (err) {
      console.error('Multi-store search error:', err);
      setError('Search failed: ' + (err.message || 'Network issue'));
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
      name: 'woo-product-image'
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

    results.forEach((item, i) => {
      page.addElement({
        type: 'image',
        src: item.url,
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

    alert('All images added as gallery on current page!');
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3>Product Images (Multi-Store)</h3>
      <p style={{ marginBottom: 16, color: '#aaa', fontSize: '14px' }}>
        Search across Smartphones Kenya, Avechi, Elix Computers.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <InputGroup
          large
          leftIcon="search"
          placeholder="Samsung Galaxy S26 Ultra, OnePlus Buds 4, ..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 280 }}
        />

        <HTMLSelect
          value={siteFilter}
          onChange={e => setSiteFilter(e.target.value)}
          style={{ minWidth: 180 }}
        >
          <option value="all">All Stores</option>
          {STORES.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </HTMLSelect>
      </div>

      <Button
        large
        intent="primary"
        onClick={searchProducts}
        loading={loading}
        disabled={loading || !query.trim()}
      >
        {loading ? 'Searching...' : 'Search Products'}
      </Button>

      {error && (
        <Callout intent="danger" style={{ marginTop: 16 }}>
          {error}
        </Callout>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: 24, flex: 1, overflowY: 'auto' }}>
          <Callout intent="success" title={`${results.length} Images Found`}>
            <div style={{ marginBottom: 16 }}>
              <Button intent="success" onClick={addAllAsGallery} style={{ marginRight: 12 }}>
                Add All as Gallery
              </Button>
              <Tag intent="primary" minimal>
                Click image to add to canvas • Download button per image
              </Tag>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {results.map((item, i) => (
                <div
                  key={i}
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s',
                    background: '#111'
                  }}
                  onClick={() => addImageToCanvas(item.url)}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <img
                    src={item.url}
                    alt={item.name}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                    onError={e => e.target.src = 'https://via.placeholder.com/180?text=Image+Error'}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.7)',
                    padding: '6px 8px',
                    fontSize: 12,
                    color: 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.name.substring(0, 40)}...
                  </div>
                  <Tag
                    minimal
                    style={{ position: 'absolute', top: 8, right: 8, fontSize: 10 }}
                  >
                    {item.source}
                  </Tag>
                  <Tag
                    intent="primary"
                    minimal
                    style={{ position: 'absolute', top: 8, left: 8, fontSize: 10 }}
                  >
                    {item.price !== 'N/A' ? `KSh ${item.price}` : 'N/A'}
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
                      downloadImage(item.url, i);
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
    <SectionTab name="Product Images" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </SectionTab>
  ),
  Panel: ProductImagesSearchPanel,
};