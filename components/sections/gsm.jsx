// components/sections/gsm.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, Button, Callout, Tag } from '@blueprintjs/core';

// Fixed: Removed extra spaces in URLs
const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const GSM_API_BASE = 'https://phapi-kappa.vercel.app/specs-image?device=';
const WSRV = 'https://wsrv.nl/?url=';

export const GsmPanel = observer(({ store }) => {
  const [device, setDevice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [filledElements, setFilledElements] = useState(0);
  const [cache, setCache] = useState(new Map());

  const fetchGsmSpecs = async () => {
    const query = device.trim().toLowerCase();
    if (!query) {
      setError('Enter a device name (e.g. s25, iphone 16 pro)');
      return;
    }

    if (cache.has(query)) {
      setResult(cache.get(query));
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setFilledElements(0);

    try {
      const apiUrl = GSM_API_BASE + encodeURIComponent(query);
      const proxyUrl = CORS_PROXY + encodeURIComponent(apiUrl);

      const res = await fetch(proxyUrl, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();
      if (!data.device) throw new Error('No device data returned');

      const images = [];
      if (data.image_2) {
        images.push(`${WSRV}${encodeURIComponent(data.image_2)}&trim=10&output=png&bg=transparent&w=800&h=800&fit=contain`);
      }
      if (data.image_1) {
        images.push(`${WSRV}${encodeURIComponent(data.image_1)}&trim=10&output=png&bg=transparent&w=800&h=800&fit=contain`);
      }

      const specs = data.specs || [];
      const processed = {
        device: data.device,
        announced: data.announced || 'Not specified',
        spec_page: data.spec_page || '',
        specs,
        spec1: specs[0] || 'N/A',
        spec2: specs[1] || 'N/A',
        spec3: specs[2] || 'N/A',
        spec4: specs[3] || 'N/A',
        images,
        body_colour: data.body_colour || 'N/A'
      };

      setCache(prev => new Map(prev).set(query, processed));
      setResult(processed);
    } catch (err) {
      setError(err.message || 'Failed to fetch specs.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading && device.trim()) {
      fetchGsmSpecs();
    }
  };

  const fillCanvas = async () => {
    if (!result) {
      setError('No data loaded yet.');
      return;
    }

    const page = store.activePage;
    if (!page) {
      setError('No active page found.');
      return;
    }

    let updatedCount = 0;

    page.children.forEach(el => {
      // Handle text elements
      if (el.type === 'text') {
        const currentText = (el.text || '').trim();
        let newText = currentText;

        const replacements = {
          '{{device}}': result.device,
          '{{announced}}': result.announced,
          '{{spec1}}': result.spec1,
          '{{spec2}}': result.spec2,
          '{{spec3}}': result.spec3,
          '{{spec4}}': result.spec4,
          '{{colour}}': result.body_colour,
          '{{color}}': result.body_colour,
          '{{body_colour}}': result.body_colour,
          '{{body_color}}': result.body_colour
        };

        Object.entries(replacements).forEach(([placeholder, value]) => {
          const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          newText = newText.replace(new RegExp(escaped, 'gi'), value || 'N/A');
        });

        if (newText !== currentText) {
          el.set({ text: newText });
          updatedCount++;
        }
      }

      // Handle image elements - CRITICAL FIX HERE
      if (el.type === 'image') {
        const match = el.name?.match(/image(\d+)/i);
        if (match) {
          const index = parseInt(match[1], 10) - 1;
          if (result.images[index]) {
            const newSrc = result.images[index];
            
            // Get current dimensions to preserve them
            const currentWidth = el.width || 300;
            const currentHeight = el.height || 300;
            const currentX = el.x || 0;
            const currentY = el.y || 0;

            // Important: Set src last to ensure dimensions are maintained
            el.set({
              src: newSrc,
              width: currentWidth,
              height: currentHeight,
              x: currentX,
              y: currentY,
              rotation: 0,
              // Ensure image is visible
              visible: true,
              // Reset crop if any
              crop: null
            });
            
            updatedCount++;
            console.log(`Updated image${index + 1}:`, { src: newSrc, width: currentWidth, height: currentHeight, x: currentX, y: currentY });
          }
        }
      }
    });

    setFilledElements(updatedCount);

    if (updatedCount === 0) {
      setError('No matching placeholders found. Use {{device}}, {{spec1}}, or name images "image1", "image2".');
    } else {
      // Force store update to refresh canvas
      store.activePage?.set({});
    }
  };

  const clearResult = () => {
    setResult(null);
    setError('');
    setFilledElements(0);
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginTop: 0 }}>GSM Arena Specs</h3>
      <p style={{ marginBottom: 16, color: '#aaa', fontSize: '14px' }}>
        Enter device name to auto-fill templates
      </p>

      <InputGroup
        large
        leftIcon="search"
        placeholder="s25, iphone 16, pixel 9..."
        value={device}
        onChange={e => setDevice(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ marginBottom: 12 }}
        disabled={loading}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button
          intent="primary"
          onClick={fetchGsmSpecs}
          loading={loading}
          disabled={loading || !device.trim()}
          fill
        >
          {loading ? 'Fetching...' : 'Get Specs'}
        </Button>
        
        {result && (
          <Button intent="warning" onClick={clearResult} icon="cross" minimal />
        )}
      </div>

      {error && (
        <Callout intent="danger" style={{ marginBottom: 16 }} onDismiss={() => setError('')}>
          {error}
        </Callout>
      )}

      {filledElements > 0 && (
        <Callout intent="success" style={{ marginBottom: 16 }}>
          Updated {filledElements} elements
        </Callout>
      )}

      {result && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Callout intent="success" title={result.device} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><Tag minimal>Announced</Tag> <div>{result.announced}</div></div>
              <div>
                <Tag minimal>Specs</Tag>
                <div style={{ fontSize: '13px', lineHeight: 1.6, marginTop: 4 }}>
                  <div>• {result.spec1}</div>
                  <div>• {result.spec2}</div>
                  <div>• {result.spec3}</div>
                  <div>• {result.spec4}</div>
                </div>
              </div>
              <div><Tag minimal>Color</Tag> <div>{result.body_colour}</div></div>
              <div><Tag minimal>Images</Tag> <div>{result.images.length} available</div></div>
              
              {result.spec_page && (
                <Button small rightIcon="share" onClick={() => window.open(result.spec_page, '_blank')} minimal>
                  View on GSMArena
                </Button>
              )}
            </div>
          </Callout>

          <Button large intent="success" onClick={fillCanvas} icon="import" fill>
            Fill Canvas Template
          </Button>

          <div style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 4, fontSize: '12px', color: '#666' }}>
            <strong>Tip:</strong> Name image elements "image1", "image2" in the Layers panel to auto-fill them.
          </div>
        </div>
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
