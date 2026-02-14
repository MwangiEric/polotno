// src/sections/json-viewer.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { Button, Callout, InputGroup, Pre, Tooltip } from '@blueprintjs/core';
import FaCode from '@meronex/icons/fa/FaCode';

export const JsonViewerPanel = observer(({ store }) => {
  const [jsonText, setJsonText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const showRawJson = () => {
    const json = store.toJSON();
    setJsonText(JSON.stringify(json, null, 2));
    setSearchTerm('');
  };

  // Filter lines for search
  const filteredLines = jsonText
    .split('\n')
    .filter(line => {
      if (!searchTerm.trim()) return true;
      return line.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .join('\n');

  // Export base64 poster + product_name / product_price coordinates
  const exportPillowTemplate = async () => {
    try {
      // Capture current canvas as base64
      const base64 = await store.toDataURL({ pixelRatio: 2 });

      // Get full state
      const fullJson = store.toJSON();

      // Find product_name (image placeholder)
      let productNameDetails = null;
      let productPriceDetails = null;

      fullJson.pages.forEach(page => {
        if (page.children) {
          page.children.forEach(el => {
            // Product image by name
            if (el.type === 'image' && el.name === 'product_image') {
              productNameDetails = {
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height,
                rotation: el.rotation || 0,
                src: el.src || '(no src)'
              };
            }
            // Product price by exact text content
            if (el.type === 'text' && el.text === 'product_price') {
              productPriceDetails = {
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height,
                fontSize: el.fontSize,
                fontFamily: el.fontFamily || 'arial.ttf',
                fill: el.fill || '#000000',
                align: el.align || 'left',
                text: el.text
              };
            }
          });
        }
      });

      // Create clean template (remove the two elements)
      const cleanTemplate = JSON.parse(JSON.stringify(fullJson));
      cleanTemplate.pages.forEach(page => {
        if (page.children) {
          page.children = page.children.filter(el => {
            if (el.type === 'image' && el.name === 'product_image') return false;
            if (el.type === 'text' && el.text === 'product_price') return false;
            return true;
          });
        }
      });

      const pillowJson = {
        schemaVersion: 1,
        description: "Poster template for Pillow automation",
        posterBase64: base64,
        product_name: productNameDetails || null,
        product_price: productPriceDetails || null,
        cleanTemplate: cleanTemplate,
        originalWidth: fullJson.width,
        originalHeight: fullJson.height,
        timestamp: new Date().toISOString()
      };

      const str = JSON.stringify(pillowJson, null, 2);
      const blob = new Blob([str], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pillow-poster-template.json';
      a.click();
      URL.revokeObjectURL(url);

      alert('Exported! File downloaded: pillow-poster-template.json\nContains base64 poster + coordinates for product_name & product_price.');
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + err.message);
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: 16,
      overflow: 'hidden',
      width: '100%',
    }}>
      <h3 style={{ marginTop: 0 }}>Raw JSON Viewer</h3>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <Button
          intent="primary"
          large
          onClick={showRawJson}
          style={{ flex: 1, minWidth: 180 }}
        >
          Load Current Canvas JSON
        </Button>

        <Tooltip content="Exports base64 poster + coordinates for product_image & product_price">
          <Button
            intent="success"
            large
            onClick={exportPillowTemplate}
            style={{ minWidth: 260 }}
          >
            Export Pillow Template (Base64 + Coordinates)
          </Button>
        </Tooltip>

        <Button
          minimal
          icon="refresh"
          onClick={() => setJsonText('')}
        >
          Clear
        </Button>
      </div>

      {jsonText && (
        <div style={{ marginBottom: 12 }}>
          <InputGroup
            leftIcon="search"
            placeholder="Filter JSON (type to search lines)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            rightElement={
              searchTerm && (
                <Button
                  minimal
                  icon="cross"
                  onClick={() => setSearchTerm('')}
                />
              )
            }
          />
        </div>
      )}

      {jsonText ? (
        <div style={{
          flex: 1,
          overflow: 'auto',
          border: '1px solid #d8d8d8',
          borderRadius: 4,
          background: '#fafafa',
          padding: 12,
          fontSize: '13px',
          lineHeight: 1.5,
        }}>
          <Pre style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontFamily: 'Consolas, monospace',
          }}>
            {filteredLines || '(no lines match your search)'}
          </Pre>
        </div>
      ) : (
        <Callout intent="primary" style={{ marginTop: 20 }}>
          Click "Load Current Canvas JSON" to view the raw state.
          <br /><br />
          Click "Export Pillow Template (Base64 + Coordinates)" to download:
          <ul style={{ margin: '8px 0 0 20px' }}>
            <li>Base64 PNG of full poster</li>
            <li>product_name: x, y, width, height (if found)</li>
            <li>product_price: x, y, width, height, fontSize, fontFamily (if found)</li>
            <li>Clean template JSON (product elements removed)</li>
          </ul>
          <br />
          Use this JSON in Python/Pillow to replace product image & price dynamically.
        </Callout>
      )}
    </div>
  );
});

export const JsonViewerSection = {
  name: 'json-viewer',
  Tab: (props) => (
    <SectionTab name="JSON" {...props}>
      <FaCode style={{ marginInline: 'auto' }} />
    </SectionTab>
  ),
  Panel: JsonViewerPanel,
  visibleInList: true,
};