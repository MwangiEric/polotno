// components/sections/product-images-search.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { Button, Callout, TextArea, Tag, Checkbox } from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const RSS_API_BASE = 'https://myrhubpy.vercel.app/smartphoneskenya/search/';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const ProductImagesSearchPanel = observer(({ store }) => {
  const [batchInput, setBatchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [autoDownload, setAutoDownload] = useState(false);

  const parseInputLine = (line) => {
    const priceMatch = line.match(/([\d,]+)\s*$/);
    const price = priceMatch ? `KSh ${priceMatch[1]}` : null;
    const name = priceMatch ? line.replace(priceMatch[0], '').trim() : line.trim();
    return { name, price };
  };

  const searchSingle = async (query, providedPrice) => {
    if (!query.trim()) return null;

    try {
      const apiUrl = `${RSS_API_BASE}${encodeURIComponent(query.trim())}.json`;
      const proxyUrl = `${CORS_PROXY}${encodeURIComponent(apiUrl)}`;

      const res = await fetch(proxyUrl);
      if (!res.ok) return null;

      const data = await res.json();
      const item = data.items?.[0]?.extra;
      if (!item) return null;

      const finalPrice = providedPrice || item.price || 'N/A';

      return {
        name: item.product_name || query.trim(),
        price: finalPrice,
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
    const templateData = templatePage.toJSON();
    
    const uploadedImages = {};
    templatePage.children.forEach((el, idx) => {
      if (el.type === 'image' && !/^image\d+$/i.test(el.name)) {
        uploadedImages[idx] = el.src;
      }
    });

    const newPage = store.addPage({
      width: templateData.width,
      height: templateData.height,
      background: templateData.background
    });

    templateData.children.forEach((child, idx) => {
      const elementData = JSON.parse(JSON.stringify(child));
      elementData.id = generateId();

      if (elementData.type === 'image') {
        if (/^image\d+$/i.test(elementData.name)) {
          elementData.src = '';
          elementData.cropX = 0;
          elementData.cropY = 0;
          elementData.cropWidth = 1;
          elementData.cropHeight = 1;
        } else {
          elementData.src = uploadedImages[idx] || '';
        }
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

    page.children.forEach(el => {
      if (el.type !== 'text') return;
      
      let newText = el.text || '';
      let changed = false;

      Object.keys(textMap).forEach(key => {
        const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (regex.test(newText)) {
          newText = newText.replace(regex, textMap[key]);
          changed = true;
        }
      });

      if (changed) {
        el.set({ text: newText });
      }
    });

    const imageElements = [];
    page.children.forEach(el => {
      if (el.type !== 'image') return;
      
      const match = el.name?.match(/^image(\d+)$/i);
      if (!match) return;
      
      const key = `image${match[1]}`;
      const src = item.images[parseInt(match[1]) - 1];
      
      if (src) {
        imageElements.push({ el, src });
      }
    });

    for (let i = 0; i < imageElements.length; i++) {
      const { el, src } = imageElements[i];
      
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

  const downloadPage = async (page, itemName) => {
    const safeName = itemName
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    const url = await store.toDataURL({
      pageId: page.id,
      mimeType: 'image/png',
      quality: 1
    });

    const link = document.createElement('a');
    link.download = `${safeName || 'poster'}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      const { name: searchName, price: providedPrice } = parseInputLine(line);
      
      setFeedback(`Searching: "${searchName}" (${i + 1}/${lines.length})...`);

      const item = await searchSingle(searchName, providedPrice);
      if (!item) {
        setFeedback(`Skipped "${searchName}" - no match (${i + 1}/${lines.length})`);
        continue;
      }

      const newPage = createCleanPage(templatePage);
      store.selectPage(newPage.id);
      await fillPage(newPage, item);
      
      if (autoDownload) {
        await new Promise(r => setTimeout(r, 500));
        await downloadPage(newPage, item.name);
      }
      
      filled.push(item);
      setFeedback(`Filled: ${item.name} (${i + 1}/${lines.length})${autoDownload ? ' + downloaded' : ''}`);
      
      if (i < lines.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setResults(filled);
    setLoading(false);
    setFeedback(`Done! Filled ${filled.length} of ${lines.length} posters.${autoDownload ? ' All downloaded.' : ''}`);
  };

  return (
    <div style={{ height: '100%', padding: 16, background: '#1a1a1b', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: 0 }}>Batch Poster Filler</h3>
      <p style={{ fontSize: 11, color: '#888', marginBottom: 15 }}>
        Paste list (one per line). Include price optionally: Product Name 45,000
      </p>

      <TextArea
        large
        fill
        growVertically
        placeholder="Samsung Galaxy S24 Ultra 125,000&#10;iPhone 16 Pro&#10;OnePlus Buds 4 9,000"
        value={batchInput}
        onChange={e => setBatchInput(e.target.value)}
        style={{ minHeight: 140, resize: 'vertical', marginBottom: 12 }}
      />

      <Checkbox
        checked={autoDownload}
        onChange={e => setAutoDownload(e.target.checked)}
        label="Auto-download each poster"
        style={{ marginBottom: 12, color: '#aaa' }}
      />

      <Button 
        large 
        intent="primary" 
        onClick={handleBatchFill} 
        loading={loading} 
        disabled={loading}
        style={{ marginBottom: 16 }}
      >
        {loading ? 'Processing...' : autoDownload ? 'Fill & Download All' : 'Fill All Posters'}
      </Button>

      {error && (
        <Callout intent="danger" style={{ marginBottom: 12 }}>
          {error}
        </Callout>
      )}
      
      {feedback && (
        <Callout intent={feedback.includes('Skipped') ? 'warning' : 'success'} style={{ marginBottom: 12 }}>
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
