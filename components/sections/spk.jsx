// components/sections/smartphoneskenya.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, Button, Callout, ProgressBar } from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';

export const SmartphonesKenyaPanel = observer(({ store }) => {
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const parseHtml = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const name = doc.querySelector('.entry-title, h1.product-title')?.textContent?.trim() || 
                 doc.querySelector('h1')?.textContent?.trim();

    const priceEl = doc.querySelector('.price .woocommerce-Price-amount, .product-price');
    let price = 'N/A';
    if (priceEl) {
      const amount = priceEl.querySelector('bdi')?.textContent || priceEl.textContent;
      price = amount.includes('KSh') ? amount.trim() : `KSh ${amount.trim()}`;
    }

    const images = [];
    doc.querySelectorAll('.woocommerce-product-gallery__image img, .flex-control-nav img').forEach(img => {
      const src = img.getAttribute('data-large_image') || img.getAttribute('data-src') || img.src;
      if (src && !images.includes(src)) images.push(src);
    });

    if (images.length === 0) {
      const mainImg = doc.querySelector('.wp-post-image, .product-main-image img');
      if (mainImg?.src) images.push(mainImg.src);
    }

    const specs = [];
    const desc = doc.querySelector('.woocommerce-product-details__short-description, .product-description');
    if (desc) {
      const text = desc.textContent;
      const ram = text.match(/(\d+)\s*GB\s*RAM/i);
      const rom = text.match(/(\d+)\s*GB\s*(ROM|Storage)/i);
      const battery = text.match(/(\d+)\s*mAh/i);
      const display = text.match(/(\d+\.?\d*)\s*(\'|"|inch)/i);

      if (ram) specs.push(`${ram[1]}GB RAM`);
      if (rom) specs.push(`${rom[1]}GB Storage`);
      if (battery) specs.push(`${battery[1]}mAh`);
      if (display) specs.push(`${display[1]}" Display`);
    }

    if (specs.length < 2) {
      doc.querySelectorAll('.woocommerce-product-attributes tr').forEach(row => {
        const label = row.querySelector('th')?.textContent?.toLowerCase() || '';
        const value = row.querySelector('td')?.textContent?.trim() || '';
        if (label.includes('ram')) specs.push(`${value} RAM`);
        else if (label.includes('storage') || label.includes('rom')) specs.push(`${value} Storage`);
        else if (label.includes('battery')) specs.push(value);
        else if (label.includes('display')) specs.push(value);
      });
    }

    return {
      name,
      price,
      spec1: specs[0] || 'N/A',
      spec2: specs[1] || 'N/A',
      spec3: specs[2] || 'N/A',
      spec4: specs[3] || 'N/A',
      images: images.slice(0, 4).map(img => {
        if (img.includes('wsrv.nl')) return img;
        return `https://wsrv.nl/?url=${encodeURIComponent(img)}&trim=20&bg=white&output=png&w=800&h=800&fit=contain`;
      })
    };
  };

  const scrapeProduct = async (url) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl.includes('smartphoneskenya.co.ke/product/')) {
      throw new Error('Invalid URL: ' + trimmedUrl);
    }

    const proxyUrl = CORS_PROXY + encodeURIComponent(trimmedUrl);
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const html = await res.text();
    const data = parseHtml(html);
    
    if (!data.name) throw new Error('Could not extract product name');

    return data;
  };

  const fillPage = (page, productData) => {
    if (!page?.children) return 0;

    page.children.forEach(el => {
      if (!el || typeof el.set !== 'function') return;

      if (el.type === 'text') {
        let newText = el.text || '';
        const replacements = {
          '{{name}}': productData.name,
          '{{price}}': productData.price,
          '{{spec1}}': productData.spec1,
          '{{spec2}}': productData.spec2,
          '{{spec3}}': productData.spec3,
          '{{spec4}}': productData.spec4
        };

        Object.entries(replacements).forEach(([placeholder, value]) => {
          const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          newText = newText.replace(new RegExp(escaped, 'gi'), value || '');
        });

        if (newText !== el.text) el.set({ text: newText });
      }

      if (el.type === 'image') {
        const match = el.name?.match(/image(\d+)/i);
        if (match) {
          const index = parseInt(match[1], 10) - 1;
          const newSrc = productData.images[index];
          
          if (newSrc) {
            el.set({ src: newSrc, visible: true });
          } else {
            el.set({ visible: false });
          }
        }
      }
    });
  };

  const exportPage = async (page, productName) => {
    const safeName = productName
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    const url = await store.toDataURL({ pageId: page.id, mimeType: 'image/png', quality: 1 });
    const link = document.createElement('a');
    link.download = `${safeName || 'product'}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processBatch = async () => {
    const urlList = urls.split(',').map(u => u.trim()).filter(Boolean);
    if (urlList.length === 0) {
      setError('Enter at least one URL');
      return;
    }

    setLoading(true);
    setError('');
    setProgress({ current: 0, total: urlList.length });

    try {
      // Get template data as JSON
      const templateJson = store.toJSON();
      const templatePage = templateJson.pages[0];

      if (!templatePage) throw new Error('No template page found');

      for (let i = 0; i < urlList.length; i++) {
        setProgress({ current: i + 1, total: urlList.length });
        
        const productData = await scrapeProduct(urlList[i]);
        
        // Create new page from template
        const newPageJson = JSON.parse(JSON.stringify(templatePage));
        newPageJson.id = undefined; // Let Polotno generate new ID
        
        // Add page to store
        store.loadJSON({
          ...templateJson,
          pages: [newPageJson]
        });
        
        // Get reference to the newly added page (last one)
        const pages = store.pages;
        const newPage = pages[pages.length - 1];
        
        // Fill with data
        fillPage(newPage, productData);
        
        // Wait for images
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Export
        await exportPage(newPage, productData.name);
      }

      setProgress({ current: 0, total: 0 });
      setUrls('');
    } catch (err) {
      setError(err.message || 'Batch failed');
      console.error('Batch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginTop: 0 }}>Smartphones Kenya</h3>
      <p style={{ marginBottom: 16, color: '#aaa', fontSize: '14px' }}>
        Paste product URLs from smartphoneskenya.co.ke
      </p>

      <InputGroup
        large
        leftIcon="mobile-phone"
        placeholder="https://smartphoneskenya.co.ke/product/..."
        value={urls}
        onChange={e => setUrls(e.target.value)}
        style={{ marginBottom: 12 }}
        disabled={loading}
      />

      {progress.total > 0 && (
        <div style={{ marginBottom: 12 }}>
          <ProgressBar value={progress.current / progress.total} intent="primary" />
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: 4 }}>
            Processing {progress.current} of {progress.total}
          </div>
        </div>
      )}

      <Button
        large
        intent="primary"
        onClick={processBatch}
        loading={loading}
        disabled={loading || !urls.trim()}
      >
        {loading ? 'Processing...' : 'Generate Posters'}
      </Button>

      {error && (
        <Callout intent="danger" style={{ marginTop: 16 }} onDismiss={() => setError('')}>
          {error}
        </Callout>
      )}
    </div>
  );
});

export const SpkSection = {
  name: 'smartphones-kenya',
  Tab: (props) => (
    <SectionTab name="SK" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    </SectionTab>
  ),
  Panel: SmartphonesKenyaPanel,
};