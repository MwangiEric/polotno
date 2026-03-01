// components/sections/product-images-search.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { Button, Callout, TextArea, Tag } from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const RSS_API_BASE = 'https://myrhubpy.vercel.app/smartphoneskenya/search/';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const ProductImagesSearchPanel = observer(({ store }) => {
  const [batchInput, setBatchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [feedback, setFeedback] = useState('');

  const searchSingle = async (q) => {
    if (!q.trim()) return null;

    try {
      const apiUrl = `${RSS_API_BASE}${encodeURIComponent(q.trim())}.json`;
      const proxyUrl = `${CORS_PROXY}${encodeURIComponent(apiUrl)}`;

      const res = await fetch(proxyUrl);
      if (!res.ok) return null;

      const data = await res.json();
      const item = data.items?.[0]?.extra;
      if (!item) return null;

      return {
        name: item.product_name || q.trim(),
        price: item.price || 'N/A',
        images: [item.image1, item.image2, item.image3, item.image4].filter(Boolean),
        specs: [
          { label: 'Display', value: item.spec1 || 'N/A' },
          { label: 'RAM', value: item.spec2 || 'N/A' },
          { label: 'Storage', value: item.spec3 || 'N/A' },
          { label: 'OS', value: item.spec4 || 'N/A' }
        ].filter(s => s.value !== 'N/A')
      };
    } catch (err) {
      console.error('Search error:', err);
      return null;
    }
  };

  const createCleanPage = (templatePage) => {
    // Deep clone template page data - breaks all references
    const templateData = JSON.parse(JSON.stringify(templatePage.toJSON()));

    // Create new page
    const newPage = store.addPage({
      width: templateData.width,
      height: templateData.height,
      background: templateData.background
    });

    // Add elements with completely fresh data
    templateData.children.forEach(child => {
      // Deep clone again to ensure no shared references
      const elementData = JSON.parse(JSON.stringify(child));
      
      // New ID
      elementData.id = generateId();
      
      // Clear image src to prevent auto-loading
      if (elementData.type === 'image') {
        elementData.src = '';
      }
      
      newPage.addElement(elementData);
    });

    return newPage;
  };

  const fillPage = async (page, item) => {
    const textMap = {
      '{{name}}': item.name,
      '{{price}}': item.price,
      '{{spec1}}': item.specs[0] ? `${item.specs[0].label}: ${item.specs[0].value}` : '',
      '{{spec2}}': item.specs[1] ? `${item.specs[1].label}: ${item.specs[1].value}` : '',
      '{{spec3}}': item.specs[2] ? `${item.specs[2].label}: ${item.specs[2].value}` : '',
      '{{spec4}}': item.specs[3] ? `${item.specs[3].label}: ${item.specs[3].value}` : '',
    };

    const imageMap = {
      'image1': item.images[0] || '',
      'image2': item.images[1] || '',
      'image3': item.images[2] || '',
      'image4': item.images[3] || '',
    };

    // Fill text elements
    page.children.forEach(el => {
      if (el.type !== 'text') return;
      
      let newText = el.text || '';
      let changed = false;

      Object.entries(textMap).forEach(([key, value]) => {
        if (newText.includes(key)) {
          const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          newText = newText.replace(new RegExp(escaped, 'gi'), value);
          changed = true;
        }
      });

      if (changed) {
        el.set({ text: newText });
      }
    });

    // Fill images sequentially
    const imageElements = [];
    page.children.forEach(el => {
      if (el.type !== 'image') return;
      
      const match = el.name?.match(/image(\d+)/i);
      if (!match) return;
      
      const key = `image${match[1]}`;
      const src = imageMap[key];
      
      if (src) {
        imageElements.push({ el, src });
      }
    });

    for (let i = 0; i < imageElements.length; i++) {
      const { el, src } = imageElements[i];
      
      // Delay between images (skip delay for first)
      if (i > 0) {
        await new Promise(r => setTimeout(r, 1000));
      }
      
      el.set({ 
        src, 
        visible: true,
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1
      });
    }
  };

  const handleBatchFill = async () => {
    const lines = batchInput.trim().split('\n').filter(Boolean);
    if (lines.length === 0) {
      setError('Paste at least one product name');
      return;
    }

    setLoading(true);
    setError('');
    setFeedback(`Starting batch (${lines.length} products)...`);
    setResults([]);

    const filled = [];
    const templatePage = store.activePage;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      setFeedback(`Searching: "${line}" (${i + 1}/${lines.length})...`);

      const item = await searchSingle(line);
      if (!item) {
        setFeedback(`Skipped "${line}" - no match (${i + 1}/${lines.length})`);
        continue;
      }

      // Create clean page from template
      const newPage = createCleanPage(templatePage);
      
      // Select and fill
      store.selectPage(newPage.id);
      await fillPage(newPage, item);
      
      filled.push(item);
      setFeedback(`Filled: ${item.name} (${i + 1}/${lines.length})`);
      
      // Small delay between products
      if (i < lines.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setResults(filled);
    setLoading(false);
    setFeedback(`Done! Filled ${filled.length} of ${lines.length} posters.`);
  };

  return (
    <div style={{ height: '100%', padding: 16, background: '#1a1a1b', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: 0 }}>Batch Poster Filler</h3>
      <p style={{ fontSize: 11, color: '#888', marginBottom: 15 }}>
        Paste list (one per line) → auto-creates & fills posters
      </p>

      <TextArea
        large
        fill
        growVertically
        placeholder="One product per line:\nSamsung Galaxy S24 Ultra\nOnePlus Buds 4\niPhone 16 Pro Max"
        value={batchInput}
        onChange={e => setBatchInput(e.target.value)}
        style={{ minHeight: 140, resize: 'vertical', marginBottom: 12 }}
      />

      <Button 
        large 
        intent="primary" 
        onClick={handleBatchFill} 
        loading={loading} 
        disabled={loading}
        style={{ marginBottom: 16 }}
      >
        {loading ? 'Processing...' : 'Start Batch Fill'}
      </Button>

      {error && (
        <Callout intent="danger" style={{ marginBottom: 12 }}>
          {error}
        </Callout>
      )}
      
      {feedback && (
        <Callout intent="success" style={{ marginBottom: 12 }}>
          {feedback}
        </Callout>
      )}

      {results.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {results.map((item, i) => (
              <div 
                key={i}
                style={{ 
                  background: '#2d2d2e', 
                  padding: 8, 
                  borderRadius: 6, 
                  border: '1px solid #444'
                }}
              >
                <img 
                  src={item.images[0]} 
                  style={{ width: '100%', height: 100, objectFit: 'contain', borderRadius: 4 }} 
                  alt="" 
                />
                <div style={{ fontSize: 10, marginTop: 6, height: 28, overflow: 'hidden', lineHeight: 1.3 }}>
                  {item.name}
                </div>
                <Tag minimal intent="success" style={{ fontSize: 9, marginTop: 4 }}>
                  {item.price}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export const ProductImagesSearchSection = {
  name: 'product-images-search',
  Tab: (props) => (
    <SectionTab name="Batch Fill" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </SectionTab>
  ),
  Panel: ProductImagesSearchPanel,
};
