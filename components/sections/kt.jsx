// components/sections/kt.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, Button, Callout, ProgressBar } from '@blueprintjs/core';

const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const RSSHUB_BASE = 'https://myrhub.vercel.app/kenyatronics/view/';

export const KtPanel = observer(({ store }) => {
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const scrapeProduct = async (url) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl.includes('kenyatronics.com/view-product/')) {
      throw new Error('Invalid URL: ' + trimmedUrl);
    }

    const slugMatch = trimmedUrl.match(/\/view-product\/([^/]+)/);
    const slug = slugMatch?.[1];
    if (!slug) throw new Error('Could not extract slug');

    const jsonUrl = `${RSSHUB_BASE}${slug}?format=json`;
    const proxyUrl = CORS_PROXY + encodeURIComponent(jsonUrl);

    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const item = json.items?.[0];
    if (!item) throw new Error('No product data');

    let contentData = {};
    try {
      contentData = JSON.parse(item.content_html || '{}');
    } catch (e) {
      console.warn('Parse error:', e);
    }

    const name = contentData.name || item.title || 'Product';
    const price = contentData.price ? `KSh ${contentData.price}` : 'N/A';
    const ram = contentData.ram || 'N/A';
    const rom = contentData.rom || 'N/A';

    // Use tags array for images (properly formatted WSRV URLs)
    const images = (item.tags || []).filter(tag => 
      tag.includes('wsrv.nl') && tag.startsWith('http')
    ).slice(0, 6);

    return {
      name: name.trim(),
      price: price.trim(),
      spec1: `RAM: ${ram}`,
      spec2: `ROM: ${rom}`,
      images
    };
  };

  const fillPage = (page, productData) => {
    let updatedCount = 0;

    // Use .set() only - no direct mutation
    page.children.forEach(el => {
      // Handle text elements
      if (el.type === 'text') {
        const currentText = el.text || '';
        let newText = currentText;

        const replacements = {
          '{{name}}': productData.name,
          '{{price}}': productData.price,
          '{{spec1}}': productData.spec1,
          '{{spec2}}': productData.spec2
        };

        Object.entries(replacements).forEach(([placeholder, value]) => {
          const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          newText = newText.replace(new RegExp(escaped, 'gi'), value || '');
        });

        if (newText !== currentText) {
          el.set({ text: newText });
          updatedCount++;
        }
      }

      // Handle image elements by index
      if (el.type === 'image') {
        const match = el.name?.match(/image(\d+)/i);
        if (match) {
          const index = parseInt(match[1], 10) - 1;
          const newSrc = productData.images[index];
          
          if (newSrc) {
            // Use .set() with preserved dimensions
            el.set({
              src: newSrc,
              visible: true
            });
            updatedCount++;
          } else {
            // Clear unused image slot
            el.set({
              src: '',
              visible: false
            });
          }
        }
      }
    });

    return updatedCount;
  };

  const exportPage = async (page, productName) => {
    // Sanitize filename
    const safeName = productName
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    const filename = `${safeName || 'product'}.png`;

    // Export specific page
    const url = await store.toDataURL({
      pageId: page.id,
      mimeType: 'image/png',
      quality: 1
    });

    // Trigger download
    const link = document.createElement('a');
    link.download = filename;
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
      // Store reference to template page (first page)
      const templatePage = store.activePage;
      
      for (let i = 0; i < urlList.length; i++) {
        const url = urlList[i];
        setProgress({ current: i + 1, total: urlList.length });

        // Scrape product data
        const productData = await scrapeProduct(url);
        
        // Add new page by cloning template
        const newPage = store.addPage({
          // Clone template page properties
          width: templatePage.width,
          height: templatePage.height,
          background: templatePage.background
        });

        // Copy children from template to new page
        templatePage.children.forEach(templateEl => {
          const newEl = newPage.addElement({
            type: templateEl.type,
            name: templateEl.name,
            x: templateEl.x,
            y: templateEl.y,
            width: templateEl.width,
            height: templateEl.height,
            rotation: templateEl.rotation,
            text: templateEl.text,
            src: templateEl.src,
            // Copy other necessary properties
            ...templateEl.toJSON()
          });
        });

        // Fill the new page with product data
        fillPage(newPage, productData);
        
        // Wait for images to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Export this specific page
        await exportPage(newPage, productData.name);
        
        // Optional: remove page after export to keep store clean
        // store.deletePages([newPage.id]);
      }

      // Reset progress
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
      <h3 style={{ marginTop: 0 }}>Kenyatronics Batch</h3>
      <p style={{ marginBottom: 16, color: '#aaa', fontSize: '14px' }}>
        Paste URLs separated by commas. Creates new page per product.
      </p>

      <InputGroup
        large
        leftIcon="globe"
        placeholder="https://kenyatronics.com/view-product/..., https://..."
        value={urls}
        onChange={e => setUrls(e.target.value)}
        style={{ marginBottom: 12 }}
        disabled={loading}
      />

      {progress.total > 0 && (
        <div style={{ marginBottom: 12 }}>
          <ProgressBar 
            value={progress.current / progress.total} 
            intent="primary"
          />
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
        {loading ? 'Processing...' : 'Process & Export All'}
      </Button>

      {error && (
        <Callout intent="danger" style={{ marginTop: 16 }} onDismiss={() => setError('')}>
          {error}
        </Callout>
      )}

      <div style={{ marginTop: 'auto', padding: 12, background: '#f5f5f5', borderRadius: 4, fontSize: '12px', color: '#666' }}>
        <strong>How it works:</strong><br />
        1. Clones template page for each product<br />
        2. Fills placeholders with product data<br />
        3. Exports PNG with product name<br />
        4. 1 second delay for image loading
      </div>
    </div>
  );
});

export const KtSection = {
  name: 'kt-batch',
  Tab: (props) => (
    <SectionTab name="KT Batch" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    </SectionTab>
  ),
  Panel: KtPanel,
};
