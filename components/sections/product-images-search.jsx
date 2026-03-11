// components/sections/product-images-search.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { 
  Button, Callout, TextArea, Tag, Checkbox, 
  HTMLSelect, InputGroup, Tabs, Tab, Card,
  Spinner, NonIdealState
} from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';

// Store configurations
const STORES = {
  'smartphoneskenya.co.ke': {
    name: 'Smartphones Kenya',
    api: 'https://myrhubpy.vercel.app/woocommerce/search/smartphoneskenya.co.ke.json'
  },
  'avechi.co.ke': {
    name: 'Avechi',
    api: 'https://myrhubpy.vercel.app/woocommerce/search/avechi.co.ke.json'
  },
  'elixcomputers.co.ke': {
    name: 'Elix Computers',
    api: 'https://myrhubpy.vercel.app/woocommerce/search/elixcomputers.co.ke.json'
  },
  'tripplek.co.ke': {
    name: 'Tripple K',
    api: 'https://myrhubpy.vercel.app/woocommerce/search/tripplek.co.ke.json'
  }
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(src);
  img.onerror = () => reject(new Error(`Failed to load: ${src}`));
  img.src = src;
});

// Clean spec text by removing prefixes like "RAM:", "Storage:", etc.
const cleanSpec = (spec) => {
  if (!spec) return '';
  return spec
    .replace(/^(RAM|Storage|Battery|Main Camera|Front Camera|Display|Processor|Connectivity|OS|Color|Weight|Dimensions|Network|SIM|Resolution|Refresh Rate|Charging|Water Resistance|Material|Warranty):\s*/i, '')
    .replace(/^[^:]+:\s*/, '')
    .trim();
};

// Format price based on user preference
const formatPrice = (priceStr, divideBy100 = false) => {
  if (!priceStr || priceStr === 'N/A') return 'N/A';
  
  const numMatch = priceStr.toString().replace(/[^0-9]/g, '');
  if (!numMatch) return priceStr;
  
  let num = parseInt(numMatch, 10);
  if (isNaN(num)) return priceStr;
  
  if (divideBy100) {
    num = num / 100;
  }
  
  return `KSh ${num.toLocaleString()}`;
};

// Build wsrv URL to prepare image for Polotno placeholder
const buildWsrvUrl = (originalUrl, width, height) => {
  // Handle nested wsrv URLs
  let cleanUrl = originalUrl;
  
  if (originalUrl && originalUrl.includes('wsrv.nl/?url=')) {
    try {
      const parsed = new URL(originalUrl);
      const innerUrl = parsed.searchParams.get('url');
      if (innerUrl) cleanUrl = decodeURIComponent(innerUrl);
    } catch (e) {
      // If parsing fails, use original
    }
  }
  
  const w = Math.round(width);
  const h = Math.round(height);
  return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${w}&h=${h}&fit=contain&n=-1&trim=10`;
};

export const ProductImagesSearchPanel = observer(({ store }) => {
  const [activeTab, setActiveTab] = useState('search');
  const [selectedStore, setSelectedStore] = useState('smartphoneskenya.co.ke');
  const [searchQuery, setSearchQuery] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [batchResults, setBatchResults] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [autoDownload, setAutoDownload] = useState(false);
  const [autoAddFirst, setAutoAddFirst] = useState(false);
  const [priceDivideBy100, setPriceDivideBy100] = useState(false);
  const [searchAllStores, setSearchAllStores] = useState(false);

  const parseInputLine = (line) => {
    const priceMatch = line.match(/(?:KSh\s*)?([\d,]+)\s*$/i);
    const price = priceMatch ? priceMatch[1].replace(/,/g, '') : null;
    const name = priceMatch ? line.replace(priceMatch[0], '').trim() : line.trim();
    return { name, price };
  };

  const searchStore = async (storeKey, query) => {
    const storeConfig = STORES[storeKey];
    if (!storeConfig) return [];

    try {
      const apiUrl = `${storeConfig.api}?q=${encodeURIComponent(query.trim())}`;
      const proxyUrl = `${CORS_PROXY}${apiUrl}`;

      const res = await fetch(proxyUrl);
      if (!res.ok) {
        console.error(`API error for ${storeKey}:`, res.status);
        return [];
      }

      const data = await res.json();
      
      if (!data.items || data.items.length === 0) return [];

      return data.items.map(item => ({
        name: item.extra?.product_name || item.title || query,
        price: formatPrice(item.extra?.price || item.price, priceDivideBy100),
        rawPrice: item.extra?.price || item.price,
        images: [
          item.extra?.image1, 
          item.extra?.image2, 
          item.extra?.image3, 
          item.extra?.image4
        ].filter(Boolean),
        specs: [
          cleanSpec(item.extra?.spec1),
          cleanSpec(item.extra?.spec2),  
          cleanSpec(item.extra?.spec3),
          cleanSpec(item.extra?.spec4)
        ].filter(Boolean),
        store: storeConfig.name,
        storeKey
      }));

    } catch (err) {
      console.error(`Search error for ${storeKey}:`, err);
      return [];
    }
  };

  const searchSingle = async (query, providedPrice) => {
    if (!query.trim()) return null;

    let allResults = [];

    if (searchAllStores) {
      const storeKeys = Object.keys(STORES);
      for (const storeKey of storeKeys) {
        const results = await searchStore(storeKey, query);
        allResults = [...allResults, ...results];
      }
    } else {
      allResults = await searchStore(selectedStore, query);
    }

    if (allResults.length === 0) return null;

    const searchLower = query.toLowerCase().trim();
    let bestMatch = allResults.find(r => 
      r.name.toLowerCase().trim() === searchLower
    );

    if (!bestMatch) {
      bestMatch = allResults.find(r => 
        r.name.toLowerCase().includes(searchLower)
      );
    }

    if (!bestMatch) {
      bestMatch = allResults[0];
    }

    if (providedPrice) {
      bestMatch.price = formatPrice(`KSh${providedPrice}`, priceDivideBy100);
    }

    return bestMatch;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setSearchResults([]);
    setFeedback('Searching...');

    try {
      let results = [];
      
      if (searchAllStores) {
        const storeKeys = Object.keys(STORES);
        for (const storeKey of storeKeys) {
          const storeResults = await searchStore(storeKey, searchQuery);
          results = [...results, ...storeResults];
        }
      } else {
        results = await searchStore(selectedStore, searchQuery);
      }

      setSearchResults(results);
      setFeedback(`Found ${results.length} results${searchAllStores ? ' across all stores' : ''}`);
    } catch (err) {
      setError('Search failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addToCanvas = async (item, autoFill = false) => {
    const templatePage = store.activePage;
    const newPage = createCleanPage(templatePage);
    store.selectPage(newPage.id);
    await fillPage(newPage, item);
    
    if (autoDownload) {
      await new Promise(r => setTimeout(r, 500));
      await downloadPage(newPage, item.name);
    }
    
    setFeedback(`Added: ${item.name}`);
    setTimeout(() => setFeedback(''), 2000);
  };

  const createCleanPage = (templatePage) => {
    const templateData = templatePage.toJSON();

    // Capture non-template images (uploaded logos, etc.)
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
      const elementData = { ...child, id: generateId() };

      if (elementData.type === 'image') {
        const isTemplateImage = /^image\d+$/i.test(elementData.name) || 
                               /\{\{image\d+\}\}/i.test(elementData.name);

        if (isTemplateImage) {
          elementData.src = '';
        } else {
          elementData.src = uploadedImages[idx] || '';
        }
      }

      newPage.addElement(elementData);
    });

    return newPage;
  };

  const fillPage = async (page, item) => {
    // Replace text placeholders
    const textMap = {
      '{{name}}': item.name,
      '{{price}}': item.price,
      '{{spec1}}': item.specs[0] || '',
      '{{spec2}}': item.specs[1] || '',
      '{{spec3}}': item.specs[2] || '',
      '{{spec4}}': item.specs[3] || '',
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
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedKey, 'gi');
        if (regex.test(newText)) {
          newText = newText.replace(regex, textMap[key]);
          changed = true;
        }
      });

      if (changed) {
        el.set({ text: newText });
      }
    });

    // Process image placeholders - wsrv prepares, Polotno places
    const imageElements = [];
    page.children.forEach(el => {
      if (el.type !== 'image') return;

      const name = el.name || '';
      const match = name.match(/\{\{image(\d+)\}\}/i) || name.match(/^image(\d+)$/i);

      if (!match) return;

      const idx = parseInt(match[1]) - 1;
      const originalSrc = item.images[idx];

      if (!originalSrc) return;

      // wsrv prepares image to exact placeholder dimensions
      const processedSrc = buildWsrvUrl(originalSrc, el.width, el.height);
      
      imageElements.push({ el, src: processedSrc });
    });

    // Load and set images - Polotno handles layout naturally
    for (const { el, src } of imageElements) {
      try {
        await loadImage(src);
        el.set({ src, visible: true });
        if (imageElements.length > 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      } catch (err) {
        console.warn('Image failed to load:', src);
        el.set({ visible: false });
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
    setBatchResults([]);
    const filled = [];
    const templatePage = store.activePage;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const { name: searchName, price: providedPrice } = parseInputLine(line);

      setFeedback(`Searching: ${searchName} (${i + 1}/${lines.length})...`);

      const item = await searchSingle(searchName, providedPrice);
      if (!item) {
        setFeedback(`Skipped: ${searchName} - no match (${i + 1}/${lines.length})`);
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

    setBatchResults(filled);
    setLoading(false);
    setFeedback(`Done! Filled ${filled.length} of ${lines.length} posters.${autoDownload ? ' All downloaded.' : ''}`);
  };

  const renderSearchTab = () => (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <HTMLSelect
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          disabled={searchAllStores}
          options={Object.entries(STORES).map(([key, config]) => ({
            value: key,
            label: config.name
          }))}
          style={{ flex: 1, minWidth: 150 }}
        />
        <Checkbox
          checked={searchAllStores}
          onChange={(e) => setSearchAllStores(e.target.checked)}
          label="Search all stores"
          style={{ margin: 0 }}
        />
      </div>

      <InputGroup
        large
        placeholder="Search product (e.g., Samsung Galaxy S10)..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        rightElement={
          <Button 
            intent="primary" 
            onClick={handleSearch}
            loading={loading}
          >
            Search
          </Button>
        }
      />

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spinner />
          <p style={{ color: '#888', marginTop: 12 }}>Searching...</p>
        </div>
      )}

      {searchResults.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: 10,
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {searchResults.map((item, idx) => (
              <Card key={idx} style={{ padding: 8 }}>
                <div style={{ 
                  width: '100%', 
                  height: 120, 
                  background: '#2d2d2e',
                  borderRadius: 4,
                  overflow: 'hidden',
                  marginBottom: 8
                }}>
                  <img 
                    src={item.images[0]} 
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>
                  {item.name}
                </div>
                <Tag minimal intent="success" style={{ marginBottom: 4 }}>
                  {item.price}
                </Tag>
                <div style={{ fontSize: 9, color: '#888', marginBottom: 8 }}>
                  {item.store}
                </div>
                <Button 
                  small 
                  intent="primary" 
                  fill
                  onClick={() => addToCanvas(item)}
                >
                  Add to Canvas
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {searchResults.length === 0 && !loading && searchQuery && (
        <NonIdealState
          icon="search"
          title="No results"
          description="Try a different search term"
        />
      )}
    </div>
  );

  const renderBatchTab = () => (
    <div style={{ padding: 12 }}>
      <p style={{ fontSize: 11, color: '#888', marginBottom: 15 }}>
        Paste list (one per line). Include price optionally: Product Name 45000
      </p>

      <TextArea
        large
        fill
        growVertically
        placeholder={'Samsung Galaxy S24 Ultra 125000\niPhone 16 Pro\nOnePlus Buds 4 9000'}
        value={batchInput}
        onChange={(e) => setBatchInput(e.target.value)}
        style={{ minHeight: 140, resize: 'vertical', marginBottom: 12 }}
      />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <Checkbox
          checked={autoDownload}
          onChange={(e) => setAutoDownload(e.target.checked)}
          label="Auto-download each poster"
        />
        <Checkbox
          checked={autoAddFirst}
          onChange={(e) => setAutoAddFirst(e.target.checked)}
          label="Auto-add first result"
        />
        <Checkbox
          checked={priceDivideBy100}
          onChange={(e) => setPriceDivideBy100(e.target.checked)}
          label="Price ÷ 100"
        />
      </div>

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

      {batchResults.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {batchResults.map((item, i) => (
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
                <div style={{ fontSize: 8, color: '#666', marginTop: 2 }}>
                  {item.store}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ height: '100%', background: '#1a1a1b', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #333' }}>
        <h3 style={{ margin: 0 }}>Gadgets</h3>
      </div>

      <Tabs
        selectedTabId={activeTab}
        onChange={setActiveTab}
        style={{ flex: 1, overflow: 'hidden' }}
      >
        <Tab 
          id="search" 
          title="Search" 
          panel={renderSearchTab()}
        />
        <Tab 
          id="batch" 
          title="Batch Fill" 
          panel={renderBatchTab()}
        />
      </Tabs>
    </div>
  );
});

export const ProductImagesSearchSection = {
  name: 'product-images-search',
  Tab: (props) => (
    <SectionTab name="Gadgets" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
        <circle cx="12" cy="14" r="4"/>
        <line x1="12" y1="6" x2="12.01" y2="6"/>
      </svg>
    </SectionTab>
  ),
  Panel: ProductImagesSearchPanel,
};
