// components/sections/gsm.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, Button, Callout, Spinner, Tag } from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const GSM_API_BASE = 'https://phapi-kappa.vercel.app/specs-image?device=';
const WSRV = 'https://wsrv.nl/?url=';

export const GsmPanel = observer(({ store }) => {
  const [device, setDevice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const fetchGsmSpecs = async () => {
    const query = device.trim();
    if (!query) {
      setError('Enter a device name (e.g. s25, iphone 16 pro)');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const apiUrl = GSM_API_BASE + encodeURIComponent(query);
      const proxyUrl = CORS_PROXY + encodeURIComponent(apiUrl);

      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();

      if (!data.device) throw new Error('No device data returned');

      // Process image via wsrv.nl
      const images = [];
      if (data.image_2) {
        images.push(`${WSRV}${encodeURIComponent(data.image_2)}&trim=10&output=png&bg=transparent&w=800&h=800&fit=contain`);
      }

      // Extract up to 4 individual specs
      const specs = data.specs || [];
      const spec1 = specs[0] || 'N/A';
      const spec2 = specs[1] || 'N/A';
      const spec3 = specs[2] || 'N/A';
      const spec4 = specs[3] || 'N/A';

      const processed = {
        device: data.device,
        announced: data.announced || 'Not specified',
        spec_page: data.spec_page || '',
        gallery_page: data.gallery_page || '',
        specs,  // full list (for display)
        spec1,
        spec2,
        spec3,
        spec4,
        images,
        body_colour: data.body_colour || 'N/A'
      };

      setResult(processed);
    } catch (err) {
      console.error('GSM API error:', err);
      setError('Failed to fetch specs. Try another device name.');
    } finally {
      setLoading(false);
    }
  };

  const fillCanvas = () => {
    if (!result) return;

    // Delay to ensure Polotno is ready
    setTimeout(() => {
      const page = store.activePage;

      page.children.forEach(el => {
        if (el.type === 'text') {
          let text = (el.text || '').trim();
          let updated = false;

          if (text.includes('{{device}}')) {
            text = text.replace(/{{device}}/gi, result.device);
            updated = true;
          }
          if (text.includes('{{announced}}')) {
            text = text.replace(/{{announced}}/gi, result.announced);
            updated = true;
          }
          if (text.includes('{{spec1}}')) {
            text = text.replace(/{{spec1}}/gi, result.spec1);
            updated = true;
          }
          if (text.includes('{{spec2}}')) {
            text = text.replace(/{{spec2}}/gi, result.spec2);
            updated = true;
          }
          if (text.includes('{{spec3}}')) {
            text = text.replace(/{{spec3}}/gi, result.spec3);
            updated = true;
          }
          if (text.includes('{{spec4}}')) {
            text = text.replace(/{{spec4}}/gi, result.spec4);
            updated = true;
          }
          if (text.includes('{{colour}}')) {
            text = text.replace(/{{colour}}/gi, result.body_colour);
            updated = true;
          }

          if (updated) {
            el.set({ text });
          }
        }

        if (el.type === 'image') {
          const match = el.name?.match(/image(\d+)/i);
          if (match) {
            const index = parseInt(match[1], 10) - 1;
            if (result.images[index]) {
              el.set({
                src: result.images[index],
                rotation: 0
              });
            }
          }
        }
      });

      alert('GSM specs filled into canvas!');
    }, 200);
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3>GSM Arena Specs</h3>
      <p style={{ marginBottom: 16, color: '#aaa', fontSize: '14px' }}>
        Enter device name (e.g. s25, iphone 16 pro max, galaxy s24 ultra)
      </p>

      <InputGroup
        large
        leftIcon="search"
        placeholder="s25, iphone 16, pixel 9..."
        value={device}
        onChange={e => setDevice(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <Button
        large
        intent="primary"
        onClick={fetchGsmSpecs}
        loading={loading}
        disabled={loading || !device.trim()}
      >
        {loading ? 'Fetching...' : 'Get Specs'}
      </Button>

      {error && (
        <Callout intent="danger" style={{ marginTop: 16 }}>
          {error}
        </Callout>
      )}

      {result && (
        <div style={{ marginTop: 24, flex: 1, overflowY: 'auto' }}>
          <Callout intent="success" title={result.device}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><strong>Announced:</strong> {result.announced}</div>
              <div>
                <strong>Individual specs (for template):</strong><br />
                {{spec1}}: {result.spec1}<br />
                {{spec2}}: {result.spec2}<br />
                {{spec3}}: {result.spec3}<br />
                {{spec4}}: {result.spec4}
              </div>
              <div><strong>Body color:</strong> {result.body_colour}</div>
              <div><strong>Images ready:</strong> {result.images.length}</div>
              {result.spec_page && (
                <Button
                  small
                  rightIcon="share"
                  onClick={() => window.open(result.spec_page, '_blank')}
                >
                  Full Specs on GSMArena
                </Button>
              )}
            </div>
          </Callout>

          <Button
            large
            intent="success"
            onClick={fillCanvas}
            style={{ marginTop: 20, width: '100%' }}
          >
            Fill Current Canvas
          </Button>
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
