// components/sections/gsm.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, Button, Callout, Tag, TextArea, Checkbox } from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const GSM_API_BASE = 'https://phapi-kappa.vercel.app/specs-image?device=';
const WSRV = 'https://wsrv.nl/?url=';

const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper to preload image with timeout and CORS handling
const preloadImage = (src, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      reject(new Error('Image load timeout'));
    }, timeout);

    img.onload = () => {
      clearTimeout(timer);
      resolve(src);
    };

    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Image load error'));
    };

    img.crossOrigin = 'anonymous';
    img.src = src;
  });
};

// Helper to fetch image through CORS proxy if direct load fails
const fetchImageWithFallback = async (src) => {
  try {
    await preloadImage(src, 5000);
    return src;
  } catch (err) {
    console.log('Direct image load failed, trying CORS proxy:', src);
  }

  if (!src.includes('wsrv.nl')) {
    try {
      const proxyUrl = CORS_PROXY + src;
      await preloadImage(proxyUrl, 8000);
      return proxyUrl;
    } catch (err) {
      console.log('CORS proxy image load also failed:', src);
    }
  }

  return src;
};

export const GsmPanel = observer(({ store }) => {
  const [singleInput, setSingleInput] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filledElements, setFilledElements] = useState(0);
  const [autoDownload, setAutoDownload] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetchGsmSpecs = async (deviceName) => {
    if (!deviceName.trim()) return null;

    const query = deviceName.trim();
    const apiUrl = GSM_API_BASE + query;
    const proxyUrl = CORS_PROXY + apiUrl;

    try {
      console.log('Fetching GSM:', proxyUrl);
      const res = await fetch(proxyUrl, {
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) throw new Error('API returned ' + res.status);

      const data = await res.json();
      if (!data.device) throw new Error('No device data returned');

      const images = [];
      if (data.image_2) {
        const wsrvUrl = WSRV + data.image_2 + '&w=800&h=800&fit=contain&output=png';
        images.push(wsrvUrl);
      }
      if (data.image_1) {
        const wsrvUrl = WSRV + data.image_1 + '&w=800&h=800&fit=contain&output=png';
        images.push(wsrvUrl);
      }

      const specs = data.specs || [];

      return {
        name: data.device,
        announced: data.announced || 'N/A',
        spec_page: data.spec_page || '',
        specs,
        spec1: specs[0] || 'N/A',
        spec2: specs[1] || 'N/A',
        spec3: specs[2] || 'N/A',
        spec4: specs[3] || 'N/A',
        spec5: specs[4] || 'N/A',
        images,
        body_colour: data.body_colour || 'N/A'
      };
    } catch (err) {
      console.error('GSM fetch error:', err);
      setError('Could not fetch specs from GSMArena.');
      return null;
    }
  };

  // Use same logic as product-images-search section
  const duplicateTemplatePage = (templatePage) => {
    const templateData = templatePage.toJSON();
    
    // Store uploaded images (non-template images like logos)
    const uploadedImages = {};
    templatePage.children.forEach((el, idx) => {
      if (el.type === 'image') {
        const name = el.name || '';
        // Check if this is a template image placeholder
        const isTemplateImage = name.match(/\{\{image\d+\}\}/i) || name.match(/^image\d+$/i);
        // Only store if it's NOT a template image (i.e., it's a logo or uploaded image)
        if (!isTemplateImage && el.src) {
          uploadedImages[idx] = el.src;
        }
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
        const name = elementData.name || '';
        const isTemplateImage = name.match(/\{\{image\d+\}\}/i) || name.match(/^image\d+$/i);
        
        if (isTemplateImage) {
          // Clear template image placeholders
          elementData.src = '';
          elementData.cropX = 0;
          elementData.cropY = 0;
          elementData.cropWidth = 1;
          elementData.cropHeight = 1;
        } else {
          // Preserve uploaded images (logos, etc.)
          elementData.src = uploadedImages[idx] || '';
        }
      }

      newPage.addElement(elementData);
    });

    return newPage;
  };

  const fillPage = async (page, deviceData, customPrice = null, customSpecs = null) => {
    let price = customPrice || 'N/A';
    let specs = customSpecs || deviceData.specs || [];

    const dataMap = {
      '{{name}}': deviceData.name || 'Unknown Device',
      '{{price}}': price,
      '{{spec1}}': specs[0] || 'N/A',
      '{{spec2}}': specs[1] || 'N/A',
      '{{spec3}}': specs[2] || 'N/A',
      '{{spec4}}': specs[3] || 'N/A',
      '{{spec5}}': specs[4] || 'N/A',
      '{{image1}}': deviceData.images[0] || '',
      '{{image2}}': deviceData.images[1] || '',
      '{{image3}}': deviceData.images[2] || '',
      '{{image4}}': deviceData.images[3] || ''
    };

    let updatedCount = 0;

    // Fill text immediately
    page.children.forEach(el => {
      if (el.type === 'text') {
        let txt = el.text || '';
        let changed = false;

        Object.keys(dataMap).forEach(k => {
          if (!k.includes('image') && (el.name === k || txt.includes(k))) {
            const escapedK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            txt = txt.replace(new RegExp(escapedK, 'gi'), dataMap[k]);
            changed = true;
          }
        });

        if (changed) {
          el.set({ text: txt });
          updatedCount++;
        }
      }
    });

    // Collect template image elements to fill
    const imageElements = [];
    page.children.forEach(el => {
      if (el.type !== 'image') return;
      
      const name = el.name || '';
      const match = name.match(/\{\{image(\d+)\}\}/i) || name.match(/^image(\d+)$/i);
      
      if (!match) return;
      
      const idx = parseInt(match[1]) - 1;
      const src = deviceData.images[idx];
      
      if (src) {
        imageElements.push({ el, src, idx, key: match[0] });
      }
    });

    // Pre-load images first
    console.log('Pre-loading', imageElements.length, 'images...');
    const loadedImages = await Promise.allSettled(
      imageElements.map(async ({ src }) => {
        try {
          const finalSrc = await fetchImageWithFallback(src);
          return { success: true, src: finalSrc, originalSrc: src };
        } catch (err) {
          console.warn('Failed to load image:', src, err);
          return { success: false, src, originalSrc: src };
        }
      })
    );

    // Set images sequentially with delays
    for (let i = 0; i < imageElements.length; i++) {
      const { el, key } = imageElements[i];
      const loadResult = loadedImages[i];
      
      let srcToSet = '';
      if (loadResult.status === 'fulfilled' && loadResult.value.success) {
        srcToSet = loadResult.value.src;
        console.log(`Setting image ${key}:`, srcToSet.substring(0, 100) + '...');
      } else {
        console.warn(`Image ${key} failed to load, skipping`);
      }

      await new Promise(resolve => {
        setTimeout(() => {
          if (srcToSet) {
            el.set({ 
              src: srcToSet,
              visible: true,
              cropX: 0,
              cropY: 0,
              cropWidth: 1,
              cropHeight: 1
            });
            updatedCount++;
          } else {
            el.set({ visible: false });
          }
          resolve();
        }, i * 1000);
      });
    }

    return updatedCount;
  };

  const downloadPage = async (page, productName) => {
    try {
      await new Promise(r => setTimeout(r, 2000));

      const safeName = (productName || 'product')
        .replace(/[^a-z0-9\s-]/gi, '')
        .replace(/\s+/g, '-')
        .toLowerCase();

      const url = await store.toDataURL({
        pageId: page.id,
        mimeType: 'image/png',
        quality: 1
      });

      const link = document.createElement('a');
      link.download = safeName + '.png';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Auto-download failed:', err);
    }
  };

  const handleSingleFill = async () => {
    const parts = singleInput.trim().split(/\s+/);
    if (parts.length < 2) {
      setError('Format: device name price (example: Samsung a56 50000)');
      return;
    }

    const price = parts.pop();
    const deviceName = parts.join(' ');

    setLoading(true);
    setError('');
    setFilledElements(0);
    setFeedback('');

    const deviceData = await fetchGsmSpecs(deviceName);

    if (!deviceData) {
      setError('No specs found for this device.');
      setLoading(false);
      return;
    }

    const templatePage = store.activePage;
    if (!templatePage) {
      setError('No template page selected');
      setLoading(false);
      return;
    }

    const newPage = duplicateTemplatePage(templatePage);
    store.selectPage(newPage.id);

    const updated = await fillPage(newPage, deviceData, 'KSh ' + Number(price).toLocaleString());

    if (autoDownload) {
      await downloadPage(newPage, deviceData.name);
    }

    setFilledElements(updated);
    setLoading(false);
  };

  const handleBatchFill = async () => {
    const lines = batchInput.trim().split('\n').filter(Boolean);
    if (lines.length === 0) {
      setError('Paste at least one line');
      return;
    }

    const templatePage = store.activePage;
    if (!templatePage) {
      setError('No template page selected');
      return;
    }

    setLoading(true);
    setError('');
    setFilledElements(0);

    let totalUpdated = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      setFeedback(`Processing ${i + 1}/${lines.length}: ${line}`);

      const newPage = duplicateTemplatePage(templatePage);
      store.selectPage(newPage.id);

      const deviceData = await fetchGsmSpecs(line);
      if (!deviceData) {
        setFeedback(`No match for ${line} (${i + 1}/${lines.length})`);
        continue;
      }

      const updated = await fillPage(newPage, deviceData);

      if (autoDownload) {
        await downloadPage(newPage, deviceData.name);
      }

      totalUpdated += updated;
      setFeedback(`Filled: ${deviceData.name} (${i + 1}/${lines.length})${autoDownload ? ' + downloaded' : ''}`);
      await new Promise(r => setTimeout(r, 2000));
    }

    store.selectPage(templatePage.id);

    setFilledElements(totalUpdated);
    setLoading(false);
    setFeedback(`Batch complete! Created ${lines.length} new filled pages. Original template untouched.`);
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginTop: 0 }}>GSM Arena Specs + Price Fill</h3>
      <p style={{ marginBottom: 16, color: '#aaa', fontSize: '14px' }}>
        Original template page stays untouched — each fill creates a new page
      </p>

      <Checkbox
        checked={autoDownload}
        onChange={e => setAutoDownload(e.target.checked)}
        label="Auto-download each filled page as PNG"
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <InputGroup
          large
          leftIcon="search"
          placeholder="Single: Samsung a56 50000"
          value={singleInput}
          onChange={e => setSingleInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSingleFill()}
          style={{ flex: 1 }}
          disabled={loading}
        />

        <Button
          intent="primary"
          onClick={handleSingleFill}
          loading={loading}
          disabled={loading || !singleInput.trim()}
        >
          Fill Single (new page)
        </Button>
      </div>

      <TextArea
        large
        fill
        growVertically
        placeholder={'Batch mode - one per line:\nSamsung a56 8gb/256gb 50000\niPhone 16 Pro 120000'}
        value={batchInput}
        onChange={e => setBatchInput(e.target.value)}
        style={{ minHeight: 100, marginBottom: 12 }}
        disabled={loading}
      />

      <Button
        large
        intent="success"
        onClick={handleBatchFill}
        loading={loading}
        disabled={loading || !batchInput.trim()}
        style={{ marginBottom: 16 }}
      >
        Fill Batch (new pages)
      </Button>

      {feedback && (
        <Callout intent="primary" style={{ marginBottom: 12 }}>
          {feedback}
        </Callout>
      )}

      {error && (
        <Callout intent="danger" style={{ marginBottom: 16 }}>
          {error}
        </Callout>
      )}

      {filledElements > 0 && (
        <Callout intent="success" style={{ marginBottom: 16 }}>
          Updated {filledElements} elements
        </Callout>
      )}
    </div>
  );
});

export const GsmSection = {
  name: 'gsm',
  Tab: (props) => (
    <SectionTab name="GSM" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12" y2="18" />
      </svg>
    </SectionTab>
  ),
  Panel: GsmPanel,
};
