// components/sections/master-panel.jsx

import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { 
  Button, InputGroup, HTMLSelect, Card, Tag,
  Checkbox, Callout, Spinner, NonIdealState,
  Tabs, Tab, FormGroup, TextArea
} from '@blueprintjs/core';

const generateId = () => Math.random().toString(36).substr(2, 9);
const WSRV_BASE = 'https://wsrv.nl/?url=';

// Decode HTML entities - remove quotes
const decodeHtmlEntities = (text) => {
  if (!text) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value.replace(/["]/g, ''); // Remove quotes
};

// Get WSRV URL - NO TRIM
const getWsrvUrl = (originalUrl, options = {}) => {
  const { width = 800, height = 800, output = 'webp' } = options;
  // Don't trim - causes cropping issues
  return `${WSRV_BASE}${originalUrl}&w=${width}&h=${height}&fit=contain&output=${output}`;
};

// Parse CSV
const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] || '';
    });
    results.push(obj);
  }
  
  return results;
};

// Parse specs without quotes
const parseSpecsToVariables = (description) => {
  if (!description) return { specs: [], specMap: {} };
  
  const decoded = decodeHtmlEntities(description);
  const lines = decoded
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(s => s.length > 3);
  
  const specMap = {};
  const specs = [];
  
  lines.forEach((line, idx) => {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const label = match[1].trim();
      const value = match[2].trim().replace(/["]/g, ''); // Remove quotes
      const varName = `{{spec${idx + 1}}}`;
      specMap[varName] = value;
      specs.push({ label, value, varName });
    } else {
      const varName = `{{spec${idx + 1}}}`;
      const cleanLine = line.replace(/["]/g, '');
      specMap[varName] = cleanLine;
      specs.push({ label: '', value: cleanLine, varName });
    }
  });
  
  return { specs, specMap };
};

// Format price without quotes
const formatPrice = (priceStr) => {
  if (!priceStr) return 'N/A';
  const num = parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
  if (isNaN(num)) return priceStr.replace(/["]/g, '');
  return `KSh ${num.toLocaleString()}`;
};

export const MasterPanel = observer(({ store }) => {
  const [dataSource, setDataSource] = useState('sheets'); // Default to sheets
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sheetsUrl, setSheetsUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vTvc7LXgvXH-HsSpoKmYucYogZ4ESuqZ7spi7LQ5mkFTZu0hyqMaD3ycDpETSnesEo4pQsQdZArxvc-/pub?output=csv');
  const [message, setMessage] = useState('');
  const [autoDownload, setAutoDownload] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Batch mode states
  const [batchInput, setBatchInput] = useState('');
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'batch'

  // Auto-load on mount
  useEffect(() => {
    if (dataSource === 'sheets' && sheetsUrl) {
      loadGoogleSheet();
    }
  }, []);

  const loadGoogleSheet = async () => {
    if (!sheetsUrl.trim()) {
      setError('Please enter Google Sheets CSV export URL');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      let csvUrl = sheetsUrl;
      if (sheetsUrl.includes('/pubhtml')) {
        csvUrl = sheetsUrl.replace('/pubhtml', '/pub?output=csv');
      } else if (sheetsUrl.includes('/edit')) {
        csvUrl = sheetsUrl.replace('/edit', '/export?format=csv');
      }
      
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error('Failed to load sheet');
      const csvText = await response.text();
      processCSVData(csvText);
    } catch (err) {
      setError('Failed to load Google Sheet. Check URL and publish settings.');
    } finally {
      setLoading(false);
    }
  };

  const processCSVData = (csvText) => {
    const data = parseCSV(csvText);
    
    const transformed = data.map((row, idx) => {
      const { specs, specMap } = parseSpecsToVariables(row.shortDescription);
      
      // Get images - up to 4, NO TRIM in WSRV
      const rawImages = [
        row['images/0/src'],
        row['images/1/src'],
        row['images/2/src'],
        row['images/3/src']
      ].filter(Boolean);
      
      return {
        id: row.id || idx,
        name: decodeHtmlEntities(row.name),
        price: formatPrice(row.price),
        rawPrice: row.price,
        category: row['categories/0/name'] || 'Uncategorized',
        inStock: row.inStock === 'true',
        description: decodeHtmlEntities(row.shortDescription),
        specs,
        specMap,
        url: row.url,
        // WSRV images - NO TRIM parameter
        images: rawImages.map((url, i) => ({
          original: url,
          wsrv: getWsrvUrl(url, { width: 800, height: 800 }),
          varName: `{{image${i + 1}}}`
        })),
        originalImages: rawImages
      };
    }).filter(p => p.name);

    setProducts(transformed);
    setFilteredProducts(transformed);
    setMessage(`Loaded ${transformed.length} products`);
    setTimeout(() => setMessage(''), 2000);
  };

  // Filter products
  useEffect(() => {
    let filtered = products;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.specs.some(s => s.value.toLowerCase().includes(q))
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products]);

  const getCategories = () => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return ['all', ...cats];
  };

  // MAINTAIN TEMPLATE - Don't replace, fill current page
  const fillProductToPage = async (page, product) => {
    // Build text map
    const textMap = {
      '{{name}}': product.name,
      '{{price}}': product.price,
      '{{category}}': product.category,
      ...product.specMap
    };

    // Fill text elements
    page.children.forEach(el => {
      if (el.type !== 'text') return;
      
      let newText = el.text || '';
      let changed = false;

      Object.keys(textMap).forEach(key => {
        const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'gi');
        if (regex.test(newText)) {
          newText = newText.replace(regex, textMap[key]);
          changed = true;
        }
      });

      if (changed) el.set({ text: newText });
    });

    // Fill images - match {{image1}} to {{image4}}
    page.children.forEach(el => {
      if (el.type !== 'image') return;
      const name = el.name || '';
      
      const match = name.match(/\{\{image([1-4])\}\}/i);
      if (!match) return;
      
      const idx = parseInt(match[1]) - 1;
      const imageData = product.images[idx];
      
      if (imageData) {
        el.set({ 
          src: imageData.wsrv,
          visible: true,
          cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1
        });
      }
    });
  };

  // Single add - maintain template on current page
  const addToCanvas = async (product) => {
    setSelectedProduct(product);
    const currentPage = store.activePage;
    
    await fillProductToPage(currentPage, product);
    
    if (autoDownload) {
      await new Promise(r => setTimeout(r, 500));
      const url = await store.toDataURL({ pageId: currentPage.id, mimeType: 'image/png', quality: 1 });
      const link = document.createElement('a');
      link.download = `${product.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
      link.href = url;
      link.click();
    }
    
    setMessage(`Filled: ${product.name}`);
    setTimeout(() => setMessage(''), 2000);
  };

  // BATCH MODE - Fill multiple products
  const handleBatchFill = async () => {
    const lines = batchInput.trim().split('\n').filter(Boolean);
    if (lines.length === 0) {
      setError('Enter at least one product name');
      return;
    }

    setLoading(true);
    setError('');
    setMessage(`Starting batch: ${lines.length} products...`);

    const templatePage = store.activePage;
    let filled = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      setMessage(`Processing ${i + 1}/${lines.length}: ${line}...`);

      // Find matching product
      const searchLower = line.toLowerCase();
      const match = products.find(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.name.toLowerCase() === searchLower
      );

      if (!match) {
        setMessage(`Not found: ${line} (${i + 1}/${lines.length})`);
        continue;
      }

      // Create new page from template for each product
      if (i > 0) {
        const newPage = store.addPage({
          width: templatePage.width,
          height: templatePage.height,
          background: templatePage.background
        });
        store.selectPage(newPage.id);
        
        // Copy template elements
        const templateData = templatePage.toJSON();
        templateData.children.forEach(child => {
          const data = JSON.parse(JSON.stringify(child));
          data.id = generateId();
          newPage.addElement(data);
        });
        
        await fillProductToPage(newPage, match);
        
        if (autoDownload) {
          await new Promise(r => setTimeout(r, 300));
          const url = await store.toDataURL({ pageId: newPage.id, mimeType: 'image/png', quality: 1 });
          const link = document.createElement('a');
          link.download = `${match.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
          link.href = url;
          link.click();
        }
      } else {
        // First product - fill current page
        await fillProductToPage(templatePage, match);
        if (autoDownload) {
          await new Promise(r => setTimeout(r, 300));
          const url = await store.toDataURL({ pageId: templatePage.id, mimeType: 'image/png', quality: 1 });
          const link = document.createElement('a');
          link.download = `${match.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
          link.href = url;
          link.click();
        }
      }

      filled++;
      setMessage(`Done: ${match.name} (${i + 1}/${lines.length})`);
      
      if (i < lines.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setMessage(`Batch complete! Filled ${filled} of ${lines.length} products.`);
    setLoading(false);
  };

  const renderProductsTab = () => (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <InputGroup
          fill
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <HTMLSelect
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          options={getCategories().map(c => ({ 
            value: c, 
            label: c === 'all' ? 'All' : c 
          }))}
        />
      </div>

      <Checkbox
        checked={autoDownload}
        onChange={(e) => setAutoDownload(e.target.checked)}
        label="Auto-download after filling"
        style={{ marginBottom: 12 }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spinner />
        </div>
      ) : filteredProducts.length === 0 ? (
        <NonIdealState
          icon="search"
          title="No products"
          description={products.length === 0 ? "Load data source first" : "No products match"}
        />
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 10,
          maxHeight: '350px',
          overflowY: 'auto'
        }}>
          {filteredProducts.map((product) => (
            <Card 
              key={product.id} 
              style={{ 
                padding: 8, 
                opacity: product.inStock ? 1 : 0.6,
                position: 'relative',
                cursor: 'pointer',
                border: selectedProduct?.id === product.id ? '2px solid #52D3D8' : 'none'
              }}
              onClick={() => setSelectedProduct(product)}
            >
              {!product.inStock && (
                <Tag intent="warning" style={{ position: 'absolute', top: 4, right: 4, fontSize: 9 }}>
                  Out of Stock
                </Tag>
              )}
              
              <div style={{ 
                width: '100%', 
                height: 100, 
                background: '#2d2d2e',
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 8
              }}>
                <img 
                  src={product.images[0]?.wsrv} 
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<span style="color:#666;font-size:10px;display:flex;height:100%;align-items:center;justify-content:center;">No Image</span>';
                  }}
                />
              </div>
              
              <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 4, lineHeight: 1.2 }}>
                {product.name}
              </div>
              
              <Tag minimal intent="success" style={{ marginBottom: 4, fontSize: 10 }}>
                {product.price}
              </Tag>
              
              <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>
                {product.category}
              </div>
              
              {product.specs.length > 0 && (
                <div style={{ fontSize: 8, color: '#aaa', marginBottom: 8 }}>
                  {product.specs.slice(0, 2).map((s, i) => (
                    <span key={i} style={{ display: 'block' }}>
                      {s.label}: {s.value.substring(0, 20)}
                    </span>
                  ))}
                </div>
              )}
              
              <Button 
                small 
                intent="primary" 
                fill
                disabled={!product.inStock}
                onClick={(e) => {
                  e.stopPropagation();
                  addToCanvas(product);
                }}
              >
                Fill Template
              </Button>
            </Card>
          ))}
        </div>
      )}

      {selectedProduct && (
        <Callout style={{ marginTop: 12, fontSize: 11 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
            Variables for {selectedProduct.name}:
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 10 }}>
            <div>{'{{name}}'} = {selectedProduct.name}</div>
            <div>{'{{price}}'} = {selectedProduct.price}</div>
            {selectedProduct.images.map((img) => (
              <div key={img.varName}>{img.varName} = {img.original.substring(0, 30)}...</div>
            ))}
            {selectedProduct.specs.slice(0, 4).map((spec) => (
              <div key={spec.varName}>
                {spec.varName} = {spec.label ? `${spec.label}: ` : ''}{spec.value.substring(0, 30)}
              </div>
            ))}
          </div>
        </Callout>
      )}
    </div>
  );

  const renderBatchTab = () => (
    <div style={{ padding: 12 }}>
      <p style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
        Enter product names (one per line). Matches against loaded catalog.
      </p>

      <TextArea
        fill
        growVertically
        placeholder={'Samsung Galaxy S24\niPhone 16 Pro\nGoogle Pixel 8'}
        value={batchInput}
        onChange={(e) => setBatchInput(e.target.value)}
        style={{ minHeight: 120, marginBottom: 12 }}
      />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <Checkbox
          checked={autoDownload}
          onChange={(e) => setAutoDownload(e.target.checked)}
          label="Auto-download each"
        />
      </div>

      <Button 
        fill 
        intent="primary" 
        onClick={handleBatchFill}
        loading={loading}
        disabled={loading || products.length === 0}
      >
        {loading ? 'Processing...' : 'Batch Fill All'}
      </Button>

      {products.length === 0 && (
        <Callout intent="warning" style={{ marginTop: 12 }}>
          Load data source first (Products tab)
        </Callout>
      )}
    </div>
  );

  return (
    <div style={{ height: '100%', background: '#1a1a1b', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #333' }}>
        <h3 style={{ margin: 0 }}>Master Catalog</h3>
        <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0 0' }}>
          {products.length} products loaded
        </p>
      </div>

      <Tabs 
        selectedTabId={activeTab} 
        onChange={setActiveTab}
        style={{ flex: 1, overflow: 'hidden' }}
      >
        <Tab id="products" title="Products" panel={renderProductsTab()} />
        <Tab id="batch" title="Batch" panel={renderBatchTab()} />
      </Tabs>

      {message && (
        <Callout intent="success" style={{ margin: 12 }}>
          {message}
        </Callout>
      )}

      {error && (
        <Callout intent="danger" style={{ margin: 12 }}>
          {error}
        </Callout>
      )}
    </div>
  );
});

export const MasterSection = {
  name: 'master',
  Tab: (props) => (
    <SectionTab name="Master" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    </SectionTab>
  ),
  Panel: MasterPanel,
};
