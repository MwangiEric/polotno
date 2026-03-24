// components/sections/csv-template-panel.jsx

import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { 
  Button, Callout, Tag, InputGroup, Card, Spinner, 
  NonIdealState, HTMLSelect, ProgressBar, TextArea, 
  Tabs, Tab, Dialog, FormGroup, ControlGroup, Checkbox,
  Divider  // <-- ADD THIS IMPORT
} from '@blueprintjs/core';

const generateId = () => Math.random().toString(36).substr(2, 9);

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(src);
  img.onerror = () => reject(new Error(`Failed to load: ${src}`));
  img.src = src;
});

// Default column mappings
const DEFAULT_MAPPINGS = {
  name: '{{name}}',
  price: '',
  spec1: '', spec2: '', spec3: '', spec4: '', spec5: '', spec6: '', spec7: '',
  image1: '', image2: '', image3: '', image4: '', image5: '', image6: '', image7: ''
};

export const CSVTemplatePanel = observer(({ store }) => {
  // Data states
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvLoaded, setCsvLoaded] = useState(false);
  
  // Configuration - USER CONFIGURABLE
  const [csvName, setCsvName] = useState('shopnbuy'); // User sets CSV filename (without .csv)
  const [imageFolder, setImageFolder] = useState('shopnbuy'); // User sets image folder name
  const [imageMode, setImageMode] = useState('local');
  const [configOpen, setConfigOpen] = useState(false);
  
  // Column mappings
  const [columnMappings, setColumnMappings] = useState({ ...DEFAULT_MAPPINGS });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState('browse');
  
  // Browse tab states
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedRows, setDisplayedRows] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Paste/Generate states
  const [pasteInput, setPasteInput] = useState('');
  const [pasteResults, setPasteResults] = useState([]);
  const [pasteProgress, setPasteProgress] = useState({ current: 0, total: 0 });
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Load CSV when csvName changes
  useEffect(() => {
    if (csvName.trim()) {
      loadCSV();
    }
  }, [csvName]);

  const loadCSV = async () => {
    setLoading(true);
    setError('');
    try {
      // Dynamic CSV path based on user input
      const csvPath = `/data/${csvName.trim()}.csv`;
      const response = await fetch(csvPath);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`CSV file not found: ${csvPath}. Make sure the file exists in public/data/`);
        }
        throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
      }
      
      const csvText = await response.text();
      const { headers, rows } = parseCSV(csvText);
      
      if (rows.length === 0) {
        throw new Error('CSV file is empty or has no valid data rows');
      }
      
      setCsvHeaders(headers);
      setCsvData(rows);
      setCsvLoaded(true);
      
      const autoMappings = detectColumns(headers);
      if (Object.values(autoMappings).some(v => v)) {
        setColumnMappings(autoMappings);
      }
      
      setFeedback(`Loaded ${rows.length} products from ${csvName}.csv`);
      setTimeout(() => setFeedback(''), 3000);
      
    } catch (err) {
      setError(err.message);
      setCsvLoaded(false);
      setCsvData([]);
      setCsvHeaders([]);
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };
    
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    
    const parseLine = (line) => {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values.map(v => v.replace(/^["']|["']$/g, ''));
    };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length < headers.length) continue;
      
      const obj = { _rowIndex: i };
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      rows.push(obj);
    }

    return { headers, rows };
  };

  const detectColumns = (headers) => {
    const mappings = { ...DEFAULT_MAPPINGS };
    const lowerHeaders = headers.map(h => h.toLowerCase());
    
    const findMatch = (patterns) => {
      for (const pattern of patterns) {
        const idx = lowerHeaders.findIndex(h => h === pattern || h.includes(pattern));
        if (idx >= 0) return headers[idx];
      }
      return '';
    };

    mappings.name = findMatch(['name', 'product', 'title', 'item']);
    mappings.price = findMatch(['price', 'cost', 'amount']);
    
    for (let i = 1; i <= 7; i++) {
      mappings[`spec${i}`] = findMatch([`spec${i}`, `spec_${i}`, `spec ${i}`, `specification${i}`]);
    }
    for (let i = 1; i <= 7; i++) {
      mappings[`image${i}`] = findMatch([`image${i}`, `img${i}`, `photo${i}`, `picture${i}`]);
    }

    return mappings;
  };

  const getValue = (row, field) => {
    const column = columnMappings[field];
    if (!column) return '';
    return row[column] || '';
  };

  // ENHANCED: Smart image path builder with fallback sizes
  // Tries: -768x768 → -768x → original
  const buildImagePath = (imageValue, requestedSize = null) => {
    if (!imageValue) return null;
    
    if (imageMode === 'url') {
      // Remote URL - use as-is or with wsrv sizing
      if (imageValue.startsWith('http')) {
        if (requestedSize) {
          const [w, h] = requestedSize.split('x');
          return `https://wsrv.nl/?url=${encodeURIComponent(imageValue)}&w=${w}&h=${h}&fit=contain&n=-1`;
        }
        return imageValue;
      }
      return null; // Invalid URL
    } else {
      // Local file with fallback chain: -768x768 → -768x → original
      const basePath = `/data/img/${imageFolder.trim()}`;
      
      // Helper to build path with suffix
      const buildWithSuffix = (suffix) => {
        const lastDot = imageValue.lastIndexOf('.');
        if (lastDot > 0) {
          const name = imageValue.substring(0, lastDot);
          const ext = imageValue.substring(lastDot);
          return `${basePath}/${name}${suffix}${ext}`;
        }
        return `${basePath}/${imageValue}${suffix}`;
      };

      // If specific size requested, try that first
      if (requestedSize) {
        return buildWithSuffix(`-${requestedSize}`);
      }

      // Otherwise, return the fallback chain as an array to try in order
      return [
        buildWithSuffix('-768x768'),  // First try: -768x768
        buildWithSuffix('-768x'),      // Second try: -768x
        `${basePath}/${imageValue}`    // Last resort: original filename
      ];
    }
  };

  // Try loading image with fallback chain
  const loadImageWithFallback = async (imageValue) => {
    const paths = buildImagePath(imageValue);
    
    if (!paths) return null;
    if (typeof paths === 'string') return paths; // Single path (URL mode or specific size)
    
    // Try each path in order
    for (const path of paths) {
      try {
        await loadImage(path);
        return path; // Success! Return this path
      } catch (err) {
        continue; // Try next fallback
      }
    }
    
    throw new Error('All image fallbacks failed');
  };

  const handleSearch = () => {
    if (!csvLoaded) return;
    setHasSearched(true);
    
    let filtered = csvData;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameCol = columnMappings.name;
      
      filtered = csvData.filter(row => {
        if (nameCol && row[nameCol]?.toLowerCase().includes(query)) return true;
        return Object.values(row).some(v => 
          String(v).toLowerCase().includes(query)
        );
      });
    }
    
    setDisplayedRows(filtered);
  };

  const getTemplatePage = () => {
    const pages = store.pages;
    if (pages.length === 0) return store.activePage;
    
    const templatePage = pages.find(p => {
      const json = p.toJSON();
      return json.children?.some(c => 
        (c.text && c.text.includes('name')) || 
        c.name?.match(/^image\d+$/i)
      );
    });
    
    return templatePage || pages[0];
  };

  const createCleanPage = (templatePage) => {
    const templateData = templatePage.toJSON();
    const uploadedImages = {};
    
    templatePage.children.forEach((el, idx) => {
      if (el.type === 'image' && !/^image\d+$/i.test(el.name) && !el.name?.includes('image')) {
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
                               elementData.name?.includes('image');
        elementData.src = isTemplateImage ? '' : (uploadedImages[idx] || '');
      }
      newPage.addElement(elementData);
    });

    return newPage;
  };

  const fillPage = async (page, row, customPrice = null) => {
    const priceToUse = customPrice !== null ? customPrice : getValue(row, 'price');
    
    // Build text replacements
    const textMap = {
      name: getValue(row, 'name'),
      price: `KSh ${parseInt(priceToUse || 0).toLocaleString()}`,
      spec1: getValue(row, 'spec1'),
      spec2: getValue(row, 'spec2'),
      spec3: getValue(row, 'spec3'),
      spec4: getValue(row, 'spec4'),
      spec5: getValue(row, 'spec5'),
      spec6: getValue(row, 'spec6'),
      spec7: getValue(row, 'spec7'),
    };

    // Replace text elements
    page.children.forEach(el => {
      if (el.type !== 'text') return;
      let newText = el.text || '';
      
      Object.keys(textMap).forEach(key => {
        const patterns = [
          new RegExp(`\\{\\{${key}\\}\\}`, 'gi')
        ];
        patterns.forEach(regex => {
          newText = newText.replace(regex, textMap[key]);
        });
      });
      
      if (newText !== el.text) el.set({ text: newText });
    });

    // Fill images with fallback chain
    const imageElements = [];
    page.children.forEach(el => {
      if (el.type !== 'image') return;
      
      const name = el.name || '';
      let imageNum = null;
      
      if (name.match(/^image\d+$/i)) {
        imageNum = parseInt(name.match(/\d+/)[0]);
      } else if (name.includes('image')) {
        const match = name.match(/image(\d)/i);
        if (match) imageNum = parseInt(match[1]);
      }
      
      if (!imageNum) return;

      const imageValue = getValue(row, `image${imageNum}`);
      if (!imageValue) return;

      imageElements.push({ el, imageValue });
    });

    for (const { el, imageValue } of imageElements) {
      try {
        // Try fallback chain: -768x768 → -768x → original
        const src = await loadImageWithFallback(imageValue);
        if (src) {
          el.set({ src, visible: true });
          if (imageElements.length > 1) await new Promise(r => setTimeout(r, 100));
        }
      } catch (err) {
        console.warn('All image fallbacks failed for:', imageValue);
        el.set({ visible: false });
      }
    }
  };

  const downloadPage = async (page, itemName) => {
    const safeName = (itemName || 'poster')
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    const url = await store.toDataURL({
      pageId: page.id,
      mimeType: 'image/png',
      quality: 1
    });

    const link = document.createElement('a');
    link.download = `${safeName}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addToCanvas = async (row, autoDownload = false, customPrice = null) => {
    const templatePage = getTemplatePage();
    const newPage = createCleanPage(templatePage);
    store.selectPage(newPage.id);
    await fillPage(newPage, row, customPrice);
    
    if (autoDownload) {
      await new Promise(r => setTimeout(r, 400));
      await downloadPage(newPage, getValue(row, 'name'));
    }
    
    setFeedback(`Added: ${getValue(row, 'name')}`);
    setTimeout(() => setFeedback(''), 2000);
  };

  const generateAll = async () => {
    if (displayedRows.length === 0) return;
    
    setGenerating(true);
    setProgress({ current: 0, total: displayedRows.length });
    const templatePage = getTemplatePage();
    
    for (let i = 0; i < displayedRows.length; i++) {
      const row = displayedRows[i];
      setProgress({ current: i + 1, total: displayedRows.length });
      
      try {
        const newPage = createCleanPage(templatePage);
        store.selectPage(newPage.id);
        await fillPage(newPage, row);
        await new Promise(r => setTimeout(r, 300));
        await downloadPage(newPage, getValue(row, 'name'));
        if (i < displayedRows.length - 1) await new Promise(r => setTimeout(r, 400));
      } catch (err) {
        console.error(`Failed for row ${i}:`, err);
      }
    }
    
    setGenerating(false);
    setFeedback(`Generated ${displayedRows.length} posters!`);
    setTimeout(() => setFeedback(''), 3000);
  };

  const parsePasteLine = (line) => {
    const priceMatch = line.match(/(?:KSh\s*)?([\d,]+)\s*$/i);
    if (priceMatch) {
      const price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
      const name = line.substring(0, line.lastIndexOf(priceMatch[0])).trim();
      return { name, price, original: line };
    }
    const startPriceMatch = line.match(/^([\d,]+)\s+/);
    if (startPriceMatch) {
      const price = parseInt(startPriceMatch[1].replace(/,/g, ''), 10);
      const name = line.substring(startPriceMatch[0].length).trim();
      return { name, price, original: line };
    }
    return { name: line.trim(), price: null, original: line };
  };

  const handlePasteGenerate = async () => {
    const lines = pasteInput.trim().split('\n').filter(Boolean);
    if (lines.length === 0) {
      setError('Paste at least one product name with price');
      return;
    }

    setGenerating(true);
    setPasteResults([]);
    setPasteProgress({ current: 0, total: lines.length });
    const templatePage = getTemplatePage();
    const results = [];
    const nameCol = columnMappings.name;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const { name: searchName, price: customPrice, original } = parsePasteLine(line);
      
      setPasteProgress({ current: i + 1, total: lines.length });
      setFeedback(`Processing: ${searchName}...`);

      const row = csvData.find(r => {
        if (nameCol && r[nameCol]?.toLowerCase().includes(searchName.toLowerCase())) return true;
        return Object.values(r).some(v => String(v).toLowerCase().includes(searchName.toLowerCase()));
      });
      
      if (!row) {
        results.push({ original, name: searchName, status: 'not_found', error: 'Not found in CSV' });
        continue;
      }

      try {
        const newPage = createCleanPage(templatePage);
        store.selectPage(newPage.id);
        await fillPage(newPage, row, customPrice);
        
        await new Promise(r => setTimeout(r, 300));
        await downloadPage(newPage, getValue(row, 'name'));
        
        results.push({
          original,
          name: getValue(row, 'name'),
          price: customPrice || getValue(row, 'price'),
          status: 'success'
        });
      } catch (err) {
        results.push({ original, name: searchName, status: 'error', error: err.message });
      }

      if (i < lines.length - 1) await new Promise(r => setTimeout(r, 500));
    }

    setPasteResults(results);
    setGenerating(false);
    const successCount = results.filter(r => r.status === 'success').length;
    setFeedback(`Done! ${successCount}/${lines.length} generated`);
    setTimeout(() => setFeedback(''), 5000);
  };

  // Get preview image path with fallback
  const getPreviewSrc = (row) => {
    const imageValue = getValue(row, 'image1');
    if (!imageValue) return null;
    // For preview, try 300x300 first, then fallbacks
    const paths = buildImagePath(imageValue);
    if (typeof paths === 'string') return paths;
    // Return first path (will try fallbacks on error)
    return paths[0];
  };

  const renderBrowseTab = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #333', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <InputGroup
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1 }}
          />
          <Button intent="primary" onClick={handleSearch} disabled={!csvLoaded}>
            Search
          </Button>
          <Button onClick={() => setConfigOpen(true)}>Config</Button>
        </div>
        
        <div style={{ fontSize: 11, color: '#888' }}>
          CSV: <strong>{csvName}.csv</strong> | 
          Images: <strong>/data/img/{imageFolder}/</strong> | 
          Mode: {imageMode === 'local' ? 'local' : 'URL'}
        </div>
      </div>

      {hasSearched && displayedRows.length > 0 && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #333', flexShrink: 0 }}>
          <Button 
            small 
            intent="success" 
            onClick={generateAll}
            disabled={generating}
            loading={generating && activeTab === 'browse'}
          >
            Generate All ({displayedRows.length})
          </Button>
        </div>
      )}

      {generating && activeTab === 'browse' && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #333', flexShrink: 0 }}>
          <ProgressBar value={progress.current / progress.total} intent="success" stripes={true} />
          <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
            {progress.current} / {progress.total}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {!hasSearched ? (
          <NonIdealState icon="search" title="Click Search to browse" description={`Images: ${imageFolder}/*.jpg (tries -768x768, -768x, original)`} />
        ) : displayedRows.length === 0 ? (
          <NonIdealState icon="search" title="No results" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {displayedRows.map((row, idx) => {
              const name = getValue(row, 'name');
              const price = getValue(row, 'price');
              const previewSrc = getPreviewSrc(row);
              
              return (
                <Card key={idx} style={{ padding: 8, background: '#2d2d2e' }}>
                  <div style={{ height: 120, background: '#1a1a1b', borderRadius: 4, overflow: 'hidden', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {previewSrc ? (
                      <img 
                        src={previewSrc} 
                        alt={name}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                          // Try next fallback in chain
                          const paths = buildImagePath(getValue(row, 'image1'));
                          if (typeof paths === 'object') {
                            const currentSrc = e.target.src;
                            const currentIndex = paths.findIndex(p => currentSrc.includes(p.replace('/data/img/', '')));
                            if (currentIndex >= 0 && currentIndex < paths.length - 1) {
                              e.target.src = paths[currentIndex + 1];
                            }
                          }
                        }}
                      />
                    ) : (
                      <span style={{ color: '#666', fontSize: 10 }}>No Image</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 4, height: 32, overflow: 'hidden' }}>
                    {name}
                  </div>
                  {getValue(row, 'spec1') && (
                    <Tag minimal style={{ marginBottom: 4, fontSize: 10 }}>{getValue(row, 'spec1')}</Tag>
                  )}
                  <div style={{ fontSize: 11, color: '#fff', marginBottom: 8 }}>
                    {price ? `KSh ${parseInt(price).toLocaleString()}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button small intent="primary" fill onClick={() => addToCanvas(row, false)}>Add</Button>
                    <Button small intent="success" onClick={() => addToCanvas(row, true)}>↓</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderPasteTab = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: 12, flexShrink: 0 }}>
        <Callout style={{ marginBottom: 12 }}>
          Paste: Name followed by price. Tool finds matching product in CSV and generates poster.
        </Callout>

        <TextArea
          fill
          growVertically={false}
          style={{ minHeight: 200, resize: 'none', marginBottom: 12 }}
          placeholder="Samsung Galaxy S24 125000&#10;iPhone 16 Pro 145000"
          value={pasteInput}
          onChange={(e) => setPasteInput(e.target.value)}
        />

        <Button 
          large 
          intent="success" 
          fill
          onClick={handlePasteGenerate}
          disabled={generating || !pasteInput.trim()}
          loading={generating}
        >
          {generating ? `Generating ${pasteProgress.current}/${pasteProgress.total}...` : 'Generate & Download All'}
        </Button>
      </div>

      {generating && (
        <div style={{ padding: '0 12px', flexShrink: 0 }}>
          <ProgressBar value={pasteProgress.current / pasteProgress.total} intent="success" stripes={true} />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {pasteResults.map((r, i) => (
          <div key={i} style={{ 
            padding: 8, 
            marginBottom: 6, 
            borderRadius: 4,
            background: r.status === 'success' ? '#0f996020' : r.status === 'not_found' ? '#fbb36020' : '#db373720',
            border: `1px solid ${r.status === 'success' ? '#0f9960' : r.status === 'not_found' ? '#fbb360' : '#db3737'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>{r.name || r.original}</span>
              <Tag minimal intent={r.status === 'success' ? 'success' : r.status === 'not_found' ? 'warning' : 'danger'}>
                {r.status}
              </Tag>
            </div>
            {r.price && <div style={{ fontSize: 10, color: '#888' }}>KSh {parseInt(r.price).toLocaleString()}</div>}
            {r.error && <div style={{ fontSize: 10, color: '#db3737' }}>{r.error}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  const renderConfigDialog = () => (
    <Dialog
      isOpen={configOpen}
      onClose={() => setConfigOpen(false)}
      title="Configuration"
      style={{ width: 500 }}
    >
      <div style={{ padding: 20 }}>
        <Callout style={{ marginBottom: 16 }} icon="settings">
          Configure CSV source and image folder. Images will try: <code>-768x768</code> → <code>-768x</code> → original
        </Callout>

        {/* CSV Name Input */}
        <FormGroup 
          label="CSV Filename" 
          helperText="Filename in public/data/ (without .csv extension)"
        >
          <ControlGroup>
            <InputGroup 
              value={csvName} 
              onChange={(e) => setCsvName(e.target.value)} 
              placeholder="shopnbuy"
            />
            <Tag minimal>.csv</Tag>
          </ControlGroup>
        </FormGroup>

        {/* Image Source Mode */}
        <FormGroup label="Image Source">
          <ControlGroup>
            <Button 
              active={imageMode === 'local'} 
              onClick={() => setImageMode('local')}
            >
              Local Files
            </Button>
            <Button 
              active={imageMode === 'url'} 
              onClick={() => setImageMode('url')}
            >
              Remote URLs
            </Button>
          </ControlGroup>
        </FormGroup>

        {/* Image Folder (only for local mode) */}
        {imageMode === 'local' && (
          <FormGroup 
            label="Image Folder" 
            helperText={`Folder inside /public/data/img/ → /data/img/${imageFolder}/`}
          >
            <InputGroup 
              value={imageFolder} 
              onChange={(e) => setImageFolder(e.target.value)} 
              placeholder="shopnbuy"
            />
          </FormGroup>
        )}

        <Divider style={{ margin: '20px 0' }} />

        <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Column Mapping</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormGroup label="Product Name">
            <HTMLSelect
              value={columnMappings.name}
              onChange={(e) => setColumnMappings({...columnMappings, name: e.target.value})}
              options={[{value: '', label: '-- None --'}, ...csvHeaders.map(h => ({value: h, label: h}))]}
            />
          </FormGroup>
          <FormGroup label="Price">
            <HTMLSelect
              value={columnMappings.price}
              onChange={(e) => setColumnMappings({...columnMappings, price: e.target.value})}
              options={[{value: '', label: '-- None --'}, ...csvHeaders.map(h => ({value: h, label: h}))]}
            />
          </FormGroup>
        </div>

        <h4 style={{ margin: '20px 0 12px 0', fontSize: 14 }}>Specifications (spec1 to spec7)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[1,2,3,4,5,6,7].map(i => (
            <FormGroup key={i} label={`Spec ${i}`} style={{ marginBottom: 8 }}>
              <HTMLSelect
                value={columnMappings[`spec${i}`]}
                onChange={(e) => setColumnMappings({...columnMappings, [`spec${i}`]: e.target.value})}
                options={[{value: '', label: '-- None --'}, ...csvHeaders.map(h => ({value: h, label: h}))]}
              />
            </FormGroup>
          ))}
        </div>

        <h4 style={{ margin: '20px 0 12px 0', fontSize: 14 }}>Images (image1 to image7)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[1,2,3,4,5,6,7].map(i => (
            <FormGroup key={i} label={`Image ${i}`} style={{ marginBottom: 8 }}>
              <HTMLSelect
                value={columnMappings[`image${i}`]}
                onChange={(e) => setColumnMappings({...columnMappings, [`image${i}`]: e.target.value})}
                options={[{value: '', label: '-- None --'}, ...csvHeaders.map(h => ({value: h, label: h}))]}
              />
            </FormGroup>
          ))}
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => setConfigOpen(false)}>Close</Button>
          <Button intent="success" onClick={() => {
            const auto = detectColumns(csvHeaders);
            setColumnMappings(auto);
          }}>Auto-Detect</Button>
        </div>
      </div>
    </Dialog>
  );

  return (
    <div style={{ height: '100%', background: '#1a1a1b', color: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #333', flexShrink: 0 }}>
        <h3 style={{ margin: 0 }}>CSV Template</h3>
        <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
          {csvLoaded ? `${csvData.length} products from ${csvName}.csv` : 'Configure CSV source'}
        </div>
      </div>

      {feedback && <Callout intent="success" style={{ margin: 8, flexShrink: 0 }}>{feedback}</Callout>}
      {error && <Callout intent="danger" style={{ margin: 8, flexShrink: 0 }} onClose={() => setError('')}>{error}</Callout>}

      <Tabs selectedTabId={activeTab} onChange={setActiveTab} style={{ flex: 1, overflow: 'hidden' }}>
        <Tab id="browse" title="Browse" panel={renderBrowseTab()} />
        <Tab id="paste" title="Paste & Generate" panel={renderPasteTab()} />
      </Tabs>

      {renderConfigDialog()}
    </div>
  );
});

export const CSVTemplateSection = {
  name: 'csv-template',
  Tab: (props) => (
    <SectionTab name="CSV Template" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    </SectionTab>
  ),
  Panel: CSVTemplatePanel,
};