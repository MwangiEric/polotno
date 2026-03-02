// components/sections/product-images-search.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { Button, Callout, TextArea, Tag, Checkbox } from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const RSS_API_BASE = 'https://myrhubpy.vercel.app/smartphoneskenya/search/';

const generateId = () => Math.random().toString(36).substr(2, 9);

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(src);
  img.onerror = () => reject(new Error(`Failed to load: ${src}`));
  img.src = src;
});

export const ProductImagesSearchPanel = observer(({ store }) => {
  const [batchInput, setBatchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [autoDownload, setAutoDownload] = useState(false);

  const parseInputLine = (line) => {
    const priceMatch = line.match(/(?:KSh\s*)?([\d,]+)\s*$/i);
    const price = priceMatch ? `KSh ${priceMatch[1].replace(/,/g, '')}` : null;
    const name = priceMatch ? line.replace(priceMatch[0], '').trim() : line.trim();
    return { name, price };
  };

  const searchSingle = async (query, providedPrice) => {
    if (!query.trim()) return null;

    try {
      // FIX: Only encode the query parameter, not the entire URL
      // The CORS proxy expects: ?url=https://api.com/endpoint/ENCODED_QUERY.json
      const encodedQuery = encodeURIComponent(query.trim());
      const apiUrl = `${RSS_API_BASE}${encodedQuery}.json`;
      
      // Don't double-encode the API URL - just pass it directly to proxy
      const proxyUrl = `${CORS_PROXY}${apiUrl}`;
      
      console.log('Fetching:', proxyUrl);
      console.log('Target API:', apiUrl);

      const res = await fetch(proxyUrl);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API error:', res.status, errorText);
        return null;
      }

      const data = await res.json();
      console.log('API Response:', data);
      
      if (!data.items || data.items.length === 0) {
        console.log('No items found');
        return null;
      }

      // Matching logic
      const searchLower = query.toLowerCase().trim();
      let matchedItem = null;
      
      // Try exact match first
      matchedItem = data.items.find(i => 
        i.extra?.product_name?.toLowerCase().trim() === searchLower
      )?.extra;
      
      // Try includes match
      if (!matchedItem) {
        matchedItem = data.items.find(i => 
          i.extra?.product_name?.toLowerCase().includes(searchLower)
        )?.extra;
      }
      
      // Fallback to first item
      if (!matchedItem) {
        matchedItem = data.items[0]?.extra;
        console.log('No match, using first item:', matchedItem?.product_name);
      }
      
      if (!matchedItem) return null;

      const finalPrice = providedPrice || matchedItem.price || 'N/A';

      return {
        name: matchedItem.product_name || query.trim(),
        price: finalPrice,
        images: [
          matchedItem.image1, 
          matchedItem.image2, 
          matchedItem.image3, 
          matchedItem.image4
        ].filter(Boolean),
        specs: [
          matchedItem.spec1 || '',  
          matchedItem.spec2 || '',  
          matchedItem.spec3 || '',  
          matchedItem.spec4 || ''   
        ]
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
      if (el.type === 'image' && !/^image\d+$/i.test(el.name) && !/\{\{image\d+\}\}/i.test(el.name)) {
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
        const isTemplateImage = /^image\d+$/i.test(elementData.name) || 
                               /\{\{image\d+\}\}/i.test(elementData.name);
        
        if (isTemplateImage) {
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
    // Case-insensitive variable mapping
    const textMap = {
      '{{name}}': item.name,
      '{{price}}': item.price,
      '{{spec1}}': item.specs[0] || '',
      '{{spec2}}': item.specs[1] || '',
      '{{spec3}}': item.specs[2] || '',
      '{{spec4}}': item.specs[3] || '',
      // Uppercase variants
      '{{NAME}}': item.name,
      '{{PRICE}}': item.price,
      '{{SPEC1}}': item.specs[0] || '',
      '{{SPEC2}}': item.specs[1] || '',
      '{{SPEC3}}': item.specs[2] || '',
      '{{SPEC4}}': item.specs[3] || '',
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

    // Handle {{image1}}, {{image2}}, etc.
    const imageElements = [];
    page.children.forEach(el => {
      if (el.type !== 'image') return;
      
      const name = el.name || '';
      const match = name.match(/\{\{image(\d+)\}\}/i) || name.match(/^image(\d+)$/i);
      
      if (!match) return;
      
      const idx = parseInt(match[1]) - 1;
      const src = item.images[idx];
      
      if (src) {
        imageElements.push({ el, src, idx });
      }
    });

    for (const { el, src } of imageElements) {
      try {
        await loadImage(src);
        
        el.set({ 
          src, 
          visible: true,
          cropX: 0,
          cropY: 0,
          cropWidth: 1,
          cropHeight: 1
        });
        
        if (imageElements.length > 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      } catch (err) {
        console.warn('Image failed to load:', src);
        el.set({ src, visible: true });
      }
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
        Paste list (one per line). Include price optionally: "Product Name 45,000"
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
