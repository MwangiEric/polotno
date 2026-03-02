// components/sections/gsm.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, Button, Callout, Tag, TextArea } from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const GSM_API_BASE = 'https://phapi-kappa.vercel.app/specs-image?device=';
const WSRV = 'https://wsrv.nl/?url=';

export const GsmPanel = observer(({ store }) => {
  const [input, setInput] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [filledElements, setFilledElements] = useState(0);
  const [batchMode, setBatchMode] = useState(false);

  const fetchGsmSpecs = async (deviceName) => {
    if (!deviceName.trim()) return null;

    const query = deviceName.trim().toLowerCase();
    const apiUrl = GSM_API_BASE + encodeURIComponent(query);
    const proxyUrl = CORS_PROXY + encodeURIComponent(apiUrl);

    try {
      const res = await fetch(proxyUrl, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const data = await res.json();
      if (!data.device) throw new Error('No device data returned');

      const images = [];
      if (data.image_2) images.push(`\( {WSRV} \){encodeURIComponent(data.image_2)}&w=800&h=800&fit=contain&output=png`);
      if (data.image_1) images.push(`\( {WSRV} \){encodeURIComponent(data.image_1)}&w=800&h=800&fit=contain&output=png`);

      const specs = data.specs || [];

      return {
        device: data.device,
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

  const fillCurrentPage = async (deviceData, customPrice = null, customSpecs = null) => {
    const page = store.activePage;
    if (!page || !deviceData) return 0;

    let price = customPrice || deviceData.price || 'N/A';
    let specs = customSpecs || deviceData.specs || [];

    const dataMap = {
      '{{name}}': deviceData.device || 'Unknown Device',
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

    page.children.forEach(el => {
      // Text replacement
      if (el.type === 'text') {
        let currentText = (el.text || '').trim();
        let newText = currentText;

        Object.entries(dataMap).forEach(([placeholder, value]) => {
          const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          newText = newText.replace(new RegExp(escaped, 'gi'), value || '');
        });

        if (newText !== currentText) {
          el.set({ text: newText });
          updatedCount++;
        }
      }

      // Image replacement - preserve size/position
      if (el.type === 'image') {
        const match = el.name?.match(/image(\d+)/i);
        if (match) {
          const index = parseInt(match[1], 10) - 1;
          if (deviceData.images[index]) {
            const newSrc = deviceData.images[index];

            const currentWidth = el.width || 300;
            const currentHeight = el.height || 300;
            const currentX = el.x || 0;
            const currentY = el.y || 0;

            el.set({
              src: newSrc,
              width: currentWidth,
              height: currentHeight,
              x: currentX,
              y: currentY,
              rotation: 0,
              visible: true
            });

            updatedCount++;
          }
        }
      }
    });

    return updatedCount;
  };

  const handleSingleFill = async () => {
    const parts = input.trim().split(/\s+/);
    if (parts.length < 2) {
      setError('Format: device name price (e.g. Samsung a56 50000)');
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

    const updated = await fillCurrentPage(deviceData, `KSh ${Number(price).toLocaleString()}`);
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

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) continue;

      const price = parts.pop();
      const deviceName = parts.join(' ');

      // Check for ram/storage variation
      let ram = null, storage = null;
      const ramStorageMatch = deviceName.match(/(\d+)gb\s*\/\s*(\d+)gb/i);
      if (ramStorageMatch) {
        ram = `${ramStorageMatch[1]}GB`;
        storage = `${ramStorageMatch[2]}GB`;
      }

      const deviceData = await fetchGsmSpecs(deviceName);
      if (!deviceData) continue;

      let specs = [...deviceData.specs];
      if (ram || storage) {
        specs = specs.map(s => {
          if (/ram/i.test(s)) return { ...s, value: ram || s.value };
          if (/storage|rom|memory/i.test(s)) return { ...s, value: storage || s.value };
          return s;
        });
      }

      const updated = await fillCurrentPage(deviceData, `KSh ${Number(price).toLocaleString()}`, specs);
      totalUpdated += updated;
    }

    setFilledElements(totalUpdated);
    setLoading(false);
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
          Supported: &quot;{{name}}&quot;, &quot;{{price}}&quot;, &quot;{{spec1}}&quot;–&quot;{{spec5}}&quot;, &quot;{{image1}}&quot;–&quot;{{image4}}&quot;
        </Tag>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <InputGroup
          large
          leftIcon="search"
          placeholder="Single: Samsung a56 50000"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSingleFill()}
          style={{ flex: 1 }}
          disabled={loading}
        />

        <Button
          intent="primary"
          onClick={handleSingleFill}
          loading={loading}
          disabled={loading || !input.trim()}
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