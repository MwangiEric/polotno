// components/sections/export-tools.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { Button, Callout, Divider, InputGroup, Pre } from '@blueprintjs/core';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const ExportToolsPanel = observer(({ store }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('export'); // 'export', 'python', 'json'

  // Standard exports
  const handleSaveJSON = () => {
    try {
      setLoading(true);
      const json = store.toJSON();
      const jsonStr = JSON.stringify(json, null, 2);
      
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `design-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setMessage('JSON saved successfully!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('Error saving JSON: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePPTX = async () => {
    try {
      setLoading(true);
      setMessage('Generating PowerPoint...');
      
      // Dynamic import to reduce initial bundle size
      const { jsonToPPTX } = await import('@polotno/pptx-export');
      await jsonToPPTX({
        json: store.toJSON(),
        output: `design-${Date.now()}.pptx`
      });
      
      setMessage('PowerPoint saved!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('Error saving PPTX: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImage = async () => {
    try {
      setLoading(true);
      await store.saveAsImage({
        fileName: `design-${Date.now()}.png`,
        pixelRatio: 2
      });
      setMessage('Image saved!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('Error saving image: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePDF = async () => {
    try {
      setLoading(true);
      setMessage('Generating PDF...');
      await store.saveAsPDF({
        fileName: `design-${Date.now()}.pdf`,
        pixelRatio: 2
      });
      setMessage('PDF saved!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('Error saving PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Python template exporter
  const exportTemplateForPython = async () => {
    setLoading(true);
    setMessage('Preparing export...');
    setDebugInfo('');

    try {
      const page = store.activePage;
      
      // Find all variable elements
      const variableElements = page.children.filter(el => {
        const name = el.name || '';
        const text = el.text || '';
        const isNameVariable = name.startsWith('{{') && name.endsWith('}}');
        const isTextVariable = text.startsWith('{{') && text.endsWith('}}');
        return isNameVariable || isTextVariable;
      });

      setDebugInfo(`Found ${variableElements.length} variables: ${variableElements.map(e => e.name || e.text).join(', ')}`);

      if (variableElements.length === 0) {
        setMessage('No variables found! Use {{name}}, {{price}}, etc.');
        setLoading(false);
        return;
      }

      // Record properties before hiding
      const variables = variableElements.map(el => {
        const varName = el.name || el.text || 'unknown';
        const baseProps = {
          name: varName,
          type: el.type,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation || 0,
          opacity: el.opacity !== undefined ? el.opacity : 1,
        };

        if (el.type === 'text') {
          return {
            ...baseProps,
            fontSize: el.fontSize || 24,
            fill: el.fill || '#000000',
            fontFamily: el.fontFamily || 'Arial',
            fontStyle: el.fontStyle || 'normal',
            fontWeight: el.fontWeight || 'normal',
            textAlign: el.align || 'left',
            placeholderText: el.text || ''
          };
        }
        
        if (el.type === 'image') {
          return {
            ...baseProps,
            keepRatio: el.keepRatio !== false,
            cropX: el.cropX || 0,
            cropY: el.cropY || 0,
            cropWidth: el.cropWidth || 1,
            cropHeight: el.cropHeight || 1
          };
        }

        return baseProps;
      });

      // Hide variables
      variableElements.forEach(el => el.set({ visible: false }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Export clean background
      const base64PNG = await store.toDataURL({
        pageId: page.id,
        mimeType: 'image/png',
        quality: 1,
        pixelRatio: 2
      });

      // Create JSON
      const templateJSON = {
        metadata: {
          exportedAt: new Date().toISOString(),
          canvasWidth: store.width,
          canvasHeight: store.height,
          variableCount: variables.length
        },
        background: {
          format: 'png',
          base64: base64PNG,
          width: store.width,
          height: store.height
        },
        variables: variables
      };

      // Download JSON
      const jsonBlob = new Blob([JSON.stringify(templateJSON, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = 'template.json';
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);

      // Download PNG
      const pngBlob = await fetch(base64PNG).then(r => r.blob());
      const pngUrl = URL.createObjectURL(pngBlob);
      const pngLink = document.createElement('a');
      pngLink.href = pngUrl;
      pngLink.download = 'background.png';
      document.body.appendChild(pngLink);
      pngLink.click();
      document.body.removeChild(pngLink);
      URL.revokeObjectURL(pngUrl);

      // Restore variables
      variableElements.forEach(el => el.set({ visible: true }));
      setMessage(`Export complete! ${variables.length} variables saved.`);

    } catch (err) {
      console.error('Export error:', err);
      setMessage('Export failed: ' + err.message);
      
      // Restore on error
      const page = store.activePage;
      if (page && page.children) {
        page.children.forEach(el => {
          const name = el.name || '';
          const text = el.text || '';
          if ((name.startsWith('{{') && name.endsWith('}}')) || 
              (text.startsWith('{{') && text.endsWith('}}'))) {
            el.set({ visible: true });
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // JSON Viewer
  const showRawJson = () => {
    const json = store.toJSON();
    setJsonText(JSON.stringify(json, null, 2));
    setSearchTerm('');
  };

  const filteredLines = jsonText
    .split('\n')
    .filter(line => {
      if (!searchTerm.trim()) return true;
      return line.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .join('\n');

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3>Export & Tools</h3>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button 
          small
          active={activeTab === 'export'}
          onClick={() => setActiveTab('export')}
        >
          Standard
        </Button>
        <Button 
          small
          active={activeTab === 'python'}
          onClick={() => setActiveTab('python')}
        >
          Python
        </Button>
        <Button 
          small
          active={activeTab === 'json'}
          onClick={() => setActiveTab('json')}
        >
          JSON
        </Button>
      </div>

      {message && (
        <Callout 
          intent={message.includes('Error') || message.includes('failed') ? 'danger' : 'success'} 
          style={{ marginBottom: 12 }}
        >
          {message}
        </Callout>
      )}

      {/* STANDARD EXPORT TAB */}
      {activeTab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button
            large
            intent="primary"
            icon="media"
            onClick={handleSaveImage}
            loading={loading}
          >
            Save as Image (PNG)
          </Button>

          <Button
            large
            intent="primary"
            icon="document"
            onClick={handleSavePDF}
            loading={loading}
          >
            Save as PDF
          </Button>

          <Divider />

          <Button
            large
            intent="success"
            icon="code"
            onClick={handleSaveJSON}
            loading={loading}
          >
            Save as JSON
          </Button>

          <Button
            large
            intent="success"
            icon="presentation"
            onClick={handleSavePPTX}
            loading={loading}
          >
            Save as PowerPoint (PPTX)
          </Button>

          <div style={{ 
            marginTop: 'auto', 
            padding: 12, 
            background: '#1a1a1b', 
            borderRadius: 8, 
            fontSize: 12, 
            color: '#888' 
          }}>
            <strong>Format Guide:</strong>
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li><strong>PNG</strong> - High quality image</li>
              <li><strong>PDF</strong> - Print-ready document</li>
              <li><strong>JSON</strong> - Editable template format</li>
              <li><strong>PPTX</strong> - PowerPoint presentation</li>
            </ul>
          </div>
        </div>
      )}

      {/* PYTHON TEMPLATE EXPORTER TAB */}
      {activeTab === 'python' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {debugInfo && (
            <Callout intent="primary" style={{ marginBottom: 12, fontSize: 12 }}>
              <code>{debugInfo}</code>
            </Callout>
          )}

          <Button
            large
            intent="success"
            icon="export"
            onClick={exportTemplateForPython}
            loading={loading}
            style={{ marginBottom: 16 }}
          >
            Export Template for Python
          </Button>

          <div style={{ 
            padding: 12, 
            background: '#111', 
            borderRadius: 8, 
            fontSize: 12, 
            color: '#888',
            marginBottom: 16
          }}>
            <strong>How to use:</strong>
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li>Name elements: {'{{name}}'}, {'{{price}}'}, {'{{image1}}'}</li>
              <li>Exports clean background + variable positions</li>
              <li>Use with Python/PIL for automated generation</li>
            </ul>
          </div>

          <div style={{ 
            flex: 1,
            padding: 12, 
            background: '#000', 
            borderRadius: 8, 
            fontSize: 11, 
            color: '#666',
            overflow: 'auto'
          }}>
            <strong>Python Example:</strong>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`import json
from PIL import Image, ImageDraw, ImageFont
import base64
from io import BytesIO

# Load template
with open('template.json') as f:
    template = json.load(f)

# Decode background
bg_data = base64.b64decode(
    template['background']['base64'].split(',')[1]
)
background = Image.open(BytesIO(bg_data))

# Draw variables
for var in template['variables']:
    if var['type'] == 'text':
        # Draw text at var['x'], var['y']
        pass
    elif var['type'] == 'image':
        # Paste image at var['x'], var['y']
        pass

background.save('output.png')`}
            </pre>
          </div>
        </div>
      )}

      {/* JSON VIEWER TAB */}
      {activeTab === 'json' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <Button
              intent="primary"
              onClick={showRawJson}
              fill
            >
              Load Current Canvas JSON
            </Button>
            <Button
              minimal
              icon="refresh"
              onClick={() => setJsonText('')}
            />
          </div>

          {jsonText && (
            <InputGroup
              leftIcon="search"
              placeholder="Filter JSON..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ marginBottom: 12 }}
              rightElement={
                searchTerm && (
                  <Button minimal icon="cross" onClick={() => setSearchTerm('')} />
                )
              }
            />
          )}

          {jsonText ? (
            <div style={{
              flex: 1,
              overflow: 'auto',
              border: '1px solid #333',
              borderRadius: 4,
              background: '#1a1a1b',
              padding: 12,
            }}>
              <Pre style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontFamily: 'Consolas, monospace',
                fontSize: 11,
                color: '#aaa'
              }}>
                {filteredLines || '(no lines match)'}
              </Pre>
            </div>
          ) : (
            <Callout intent="primary">
              Click Load Current Canvas JSON to see the full raw state.
              <ul style={{ margin: '8px 0 0 20px' }}>
                <li>Check exact x/y/width/height</li>
                <li>View image src URLs</li>
                <li>See text content and placeholders</li>
              </ul>
            </Callout>
          )}
        </div>
      )}
    </div>
  );
});

export const ExportToolsSection = {
  name: 'export-tools',
  Tab: (props) => (
    <SectionTab name="Export" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </SectionTab>
  ),
  Panel: ExportToolsPanel,
};
