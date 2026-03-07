// components/sections/master-panel.jsx

import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { 
  Button, InputGroup, HTMLSelect, Card, Tag,
  Checkbox, Callout, Spinner, NonIdealState,
  Tabs, Tab, FormGroup
} from '@blueprintjs/core';

const generateId = () => Math.random().toString(36).substr(2, 9);
const WSRV_BASE = 'https://wsrv.nl/?url=';

// Decode HTML entities
const decodeHtmlEntities = (text) => {
  if (!text) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

// Get WSRV optimized URL
const getWsrvUrl = (originalUrl, options = {}) => {
  const { width = 800, height = 800, output = 'webp' } = options;
  return `${WSRV_BASE}${originalUrl}&w=${width}&h=${height}&fit=contain&output=${output}&n=-1`;
};

// Parse CSV text to array of objects
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

// Parse specs and convert to {{spec1}}, {{spec2}} format
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
      const value = match[2].trim();
      const varName = `{{spec${idx + 1}}}`;
      specMap[varName] = value;
      specs.push({ label, value, varName });
    } else {
      const varName = `{{spec${idx + 1}}}`;
      specMap[varName] = line;
      specs.push({ label: '', value: line, varName });
    }
  });
  
  return { specs, specMap };
};

// Format price
const formatPrice = (priceStr) => {
  if (!priceStr) return 'N/A';
  const num = parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
  if (isNaN(num)) return priceStr;
  return `KSh ${num.toLocaleString()}`;
};

export const MasterPanel = observer(({ store }) => {
  const [dataSource, setDataSource] = useState('local');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [message, setMessage] = useState('');
  const [autoDownload, setAutoDownload] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    if (dataSource === 'local') {
      loadLocalCSV();
    }
  }, [dataSource]);

  const loadLocalCSV = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/data/avechi.csv');
      if (!response.ok) throw new Error('Failed to load CSV');
      const csvText = await response.text();
      processCSVData(csvText);
    } catch (err) {
      setError('Local CSV not found. Upload to public/data/avechi.csv or use Google Sheets');
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

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
      setError('Failed to load Google Sheet. Make sure it\'s published to web.');
    } finally {
      setLoading(false);
    }
  };

  const processCSVData = (csvText) => {
    const data = parseCSV(csvText);
    
    const transformed = data.map((row, idx) => {
      const { specs, specMap } = parseSpecsToVariables(row.shortDescription);
      
      // Get up to 4 images with WSRV optimization
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
        // WSRV optimized images for {{image1}} to {{image4}}
        images: rawImages.map((url, i) => ({
          original: url,
          wsrv: getWsrvUrl(url, { width: 800, height: 800 }),
          varName: `{{image${i + 1}}}`
        })),
        // Keep original URLs for full resolution
        originalImages: rawImages
      };
    }).filter(p => p.name);

    setProducts(transformed);
    setFilteredProducts(transformed);
    setMessage(`Loaded ${transformed.length} products`);
    setTimeout(() => setMessage(''), 2000);
  };

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

  const createCleanPage = (templatePage) => {
    if (!templatePage) {
      const newPage = store.addPage({ width: 1080, height: 1080 });
      return newPage;
    }

    const templateData = templatePage.toJSON();
    const newPage = store.addPage({
      width: templateData.width,
      height: templateData.height,
      background: templateData.background
    });

    const preservedElements = templatePage.children.filter(el => {
      const name = el.name || '';
      return !name.includes('{{') && !name.match(/^image\d+$/);
    });

    preservedElements.forEach(el => {
      const data = JSON.parse(JSON.stringify(el.toJSON()));
      data.id = generateId();
      newPage.addElement(data);
    });

    return newPage;
  };

  const fillProductToPage = async (page, product) => {
    // Build complete text map with {{name}}, {{price}}, {{spec1}}-{{spec8}}
    const textMap = {
      '{{name}}': product.name,
      '{{price}}': product.price,
      '{{category}}': product.category,
      ...product.specMap
    };

    // Fill all text elements
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

    // Fill images - match {{image1}}, {{image2}}, {{image3}}, {{image4}}
    const imageElements = [];
    page.children.forEach(el => {
      if (el.type !== 'image') return;
      const name = el.name || '';
      
      // Match {{image1}}, {{image2}}, {{image3}}, {{image4}}
      const match = name.match(/\{\{image([1-4])\}\}/i);
      if (!match) return;
      
      const idx = parseInt(match[1]) - 1;
      const imageData = product.images[idx];
      
      if (imageData) {
        imageElements.push({ 
          el, 
          src: imageData.wsrv,  // WSRV optimized
          original: imageData.original,
          varName: imageData.varName
        });
      }
    });

    for (const { el, src } of imageElements) {
      el.set({ 
        src, 
        visible: true,
        cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1
      });
      await new Promise(r => setTimeout(r, 100));
    }
  };

  const addToCanvas = async (product) => {
    setSelectedProduct(product);
    const templatePage = store.activePage;
    const newPage = createCleanPage(templatePage);
    store.selectPage(newPage.id);
    
    await fillProductToPage(newPage, product);
    
    if (autoDownload) {
      await new Promise(r => setTimeout(r, 500));
      const url = await store.toDataURL({ pageId: newPage.id, mimeType: 'image/png', quality: 1 });
      const link = document.createElement('a');
      link.download = `${product.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
      link.href = url;
      link.click();
    }
    
    setMessage(`Added: ${product.name} with {{name}}, {{price}}, {{image1}}-{{image4}}`);
    setTimeout(() => setMessage(''), 3000);
  };

  const renderDataSourceTab = () => (
    <div style={{ padding: 12 }}>
      <FormGroup label="Data Source">
        <HTMLSelect
          fill
          value={dataSource}
          onChange={(e) => setDataSource(e.target.value)}
          options={[
            { value: 'local', label: 'Local CSV (public/data/avechi.csv)' },
            { value: 'sheets', label: 'Google Sheets' }
          ]}
        />
      </FormGroup>

      {dataSource === 'local' ? (
        <Callout intent="primary">
          Place your CSV file at <code>public/data/avechi.csv</code>
        </Callout>
      ) : (
        <div>
          <FormGroup label="Google Sheets CSV URL">
            <InputGroup
              fill
              placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
              value={sheetsUrl}
              onChange={(e) => setSheetsUrl(e.target.value)}
            />
          </FormGroup>
          <Button 
            fill 
            intent="primary" 
            onClick={loadGoogleSheet}
            loading={loading}
          >
            Load from Google Sheets
          </Button>
        </div>
      )}

      {error && (
        <Callout intent="danger" style={{ marginTop: 12 }}>
          {error}
        </Callout>
      )}
    </div>
  );

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
        label="Auto-download after adding"
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
                      <strong>{s.label}:</strong> {s.value.substring(0, 20)}
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
                Add to Canvas
              </Button>
            </Card>
          ))}
        </div>
      )}

      {selectedProduct && (
        <Callout style={{ marginTop: 12, fontSize: 11 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
            Template Variables for {selectedProduct.name}:
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 10 }}>
            <div>{'{{name}}'} = {selectedProduct.name}</div>
            <div>{'{{price}}'} = {selectedProduct.price}</div>
            {selectedProduct.images.map((img, i) => (
              <div key={i}>{img.varName} = Image {i + 1}</div>
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

  return (
    <div style={{ height: '100%', background: '#1a1a1b', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #333' }}>
        <h3 style={{ margin: 0 }}>Master Catalog</h3>
        <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0 0' }}>
  {products.length} products • {'{{name}} {{price}} {{image1}}-{{image4}}'}
</p>
      </div>

      <Tabs selectedTabId="products" style={{ flex: 1, overflow: 'hidden' }}>
        <Tab id="source" title="Source" panel={renderDataSourceTab()} />
        <Tab id="products" title="Products" panel={renderProductsTab()} />
      </Tabs>

      {message && (
        <Callout intent="success" style={{ margin: 12 }}>
          {message}
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
