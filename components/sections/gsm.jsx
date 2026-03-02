// components/sections/gsm.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, Button, Callout, Tag, TextArea, Checkbox } from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const GSM_API_BASE = 'https://phapi-kappa.vercel.app/specs-image?device=';
const WSRV = 'https://wsrv.nl/?url=';

export const GsmPanel = observer(({ store }) => {
  const [singleInput, setSingleInput] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filledElements, setFilledElements] = useState(0);
  const [autoDownload, setAutoDownload] = useState(false);

  const fetchGsmSpecs = async (deviceName) => {
    if (!deviceName.trim()) return null;

    const query = deviceName.trim().toLowerCase();
    const apiUrl = GSM_API_BASE + encodeURIComponent(query);
    const proxyUrl = CORS_PROXY + encodeURIComponent(apiUrl);

    try {
      const res = await fetch(proxyUrl, {
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) throw new Error('API returned ' + res.status);

      const data = await res.json();
      if (!data.device) throw new Error('No device data returned');

      const images = [];
      if (data.image_2) {
        const src = data.image_2;
        const wsrvUrl = WSRV + encodeURIComponent(src) + '&w=800&h=800&fit=contain&output=png';
        images.push(wsrvUrl);
      }
      if (data.image_1) {
        const src = data.image_1;
        const wsrvUrl = WSRV + encodeURIComponent(src) + '&w=800&h=800&fit=contain&output=png';
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

  const duplicateTemplatePage = (templatePage) => {
    const newPage = store.addPage({
      width: templatePage.width,
      height: templatePage.height,
      background: templatePage.background || '#ffffff'
    });

    templatePage.children.forEach(child => {
      const cleanData = {
        type: child.type,
        name: child.name,
        x: child.x,
        y: child.y,
        width: child.width,
        height: child.height,
        rotation: child.rotation || 0,
        opacity: child.opacity || 1,
        visible: child.visible !== false
      };

      if (child.type === 'text') {
        cleanData.text = child.text || '';
        cleanData.fontSize = child.fontSize;
        cleanData.fill = child.fill;
        cleanData.align = child.align || 'left';
        cleanData.fontFamily = child.fontFamily;
      }

      if (child.type === 'image') {
        cleanData.src = '';
        cleanData.keepRatio = child.keepRatio !== false;
      }

      newPage.addElement(cleanData);
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
            txt = txt.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), dataMap[k]);
            changed = true;
          }
        });

        if (changed) {
          el.set({ text: txt });
          updatedCount++;
        }
      }
    });

    // Fill images sequentially (1 second delay each)
    const imageElements = page.children.filter(el => el.type === 'image');

    for (let i = 0; i < imageElements.length; i++) {
      const el = imageElements[i];

      let srcToSet = null;
      Object.keys(dataMap).forEach(k => {
        if (k.includes('image') && el.name === k) {
          srcToSet = dataMap[k];
        }
      });

      if (srcToSet) {
        await new Promise(resolve => {
          setTimeout(() => {
            el.set({ src: srcToSet });
            updatedCount++;
            resolve();
          }, i * 1000);
        });
      }
    }

    return updatedCount;
  };

  const downloadPage = async (page, productName) => {
    try {
      await new Promise(r => setTimeout(r, 1500));

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

    const deviceData = await fetchGsmSpecs(deviceName);

    if (!deviceData) {
      setError('No specs found for this device.');
      setLoading(false);
      return;
    }

    const newPage = duplicateTemplatePage(store.activePage);
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

    setLoading(true);
    setError('');
    setFilledElements(0);

    let totalUpdated = 0;
    const templatePage = store.activePage;

    if (!templatePage) {
      setError('No template page selected');
      setLoading(false);
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      setFeedback(`Processing \( {i + 1}/ \){lines.length}: ${line}`);

      const newPage = duplicateTemplatePage(templatePage);
      store.selectPage(newPage.id);

      const deviceData = await fetchGsmSpecs(line);
      if (!deviceData) {
        setFeedback(`No match for \( {line} ( \){i + 1}/${lines.length})`);
        continue;
      }

      const updated = await fillPage(newPage, deviceData);

      if (autoDownload) {
        await downloadPage(newPage, deviceData.name);
      }

      totalUpdated += updated;
      setFeedback(`Filled: \( {deviceData.name} ( \){i + 1}/\( {lines.length}) \){autoDownload ? ' + downloaded' : ''}`);
      await new Promise(r => setTimeout(r, 1500));
    }

    setFilledElements(totalUpdated);
    setLoading(false);
    setFeedback(`Batch complete! Filled ${lines.length} posters.`);
  };

  const duplicateTemplatePage = (templatePage) => {
    const newPage = store.addPage({
      width: templatePage.width,
      height: templatePage.height,
      background: templatePage.background || '#ffffff'
    });

    templatePage.children.forEach(child => {
      const cleanData = {
        type: child.type,
        name: child.name,
        x: child.x,
        y: child.y,
        width: child.width,
        height: child.height,
        rotation: child.rotation || 0,
        opacity: child.opacity || 1,
        visible: child.visible !== false
      };

      if (child.type === 'text') {
        cleanData.text = child.text || '';
        cleanData.fontSize = child.fontSize;
        cleanData.fill = child.fill;
        cleanData.align = child.align || 'left';
        cleanData.fontFamily = child.fontFamily;
      }

      if (child.type === 'image') {
        cleanData.src = '';
        cleanData.keepRatio = child.keepRatio !== false;
      }

      newPage.addElement(cleanData);
    });

    return newPage;
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginTop: 0 }}>GSM Arena Specs + Price Fill</h3>
      <p style={{ marginBottom: 16, color: '#aaa', fontSize: '14px' }}>
        Single: device name price<br />
        Batch: one per line (device name [ram/storage] price)
      </p>

      <div style={{ marginBottom: 12 }}>
        <Tag intent="primary" minimal style={{ fontSize: 11 }}>
          Supported placeholders: name, price, spec1 to spec5, image1 to image4
        </Tag>
      </div>

      <Checkbox
        checked={autoDownload}
        onChange={e => setAutoDownload(e.target.checked)}
        label="Auto-download each filled poster as PNG"
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
          Fill Single
        </Button>
      </div>

      <TextArea
        large
        fill
        growVertically
        placeholder="Batch mode - one per line:\nSamsung a56 8gb/256gb 50000\niPhone 16 Pro 120000"
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
        Fill Batch
      </Button>

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