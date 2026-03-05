// components/sections/export-tools.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { Button, Callout, Divider, InputGroup, Pre } from '@blueprintjs/core';

export const ExportToolsPanel = observer(({ store }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('export');

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

  const exportTemplateForPython = async () => {
    setLoading(true);
    setMessage('Preparing export...');
    try {
      const page = store.activePage;
      const variableElements = page.children.filter(el => {
        const name = el.name || '';
        const text = el.text || '';
        return (name.startsWith('{{') && name.endsWith('}}')) || (text.startsWith('{{') && text.endsWith('}}'));
      });

      if (variableElements.length === 0) {
        setMessage('No variables found! Use {{name}} tags.');
        setLoading(false);
        return;
      }

      const variables = variableElements.map(el => ({
        name: el.name || el.text,
        type: el.type,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        fontSize: el.fontSize,
        fill: el.fill,
        fontFamily: el.fontFamily
      }));

      variableElements.forEach(el => el.set({ visible: false }));
      await new Promise(r => setTimeout(r, 100));

      const base64PNG = await store.toDataURL({ pixelRatio: 2 });

      const templateJSON = {
        background: { base64: base64PNG, width: store.width, height: store.height },
        variables
      };

      const jsonBlob = new Blob([JSON.stringify(templateJSON, null, 2)], { type: 'application/json' });
      const jsonLink = document.createElement('a');
      jsonLink.href = URL.createObjectURL(jsonBlob);
      jsonLink.download = 'python-template.json';
      jsonLink.click();

      variableElements.forEach(el => el.set({ visible: true }));
      setMessage('Export complete!');
    } catch (err) {
      setMessage('Export failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const showRawJson = () => {
    setJsonText(JSON.stringify(store.toJSON(), null, 2));
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3>Export Tools</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['export', 'python', 'json'].map(tab => (
          <Button key={tab} small active={activeTab === tab} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {message && <Callout intent="primary" style={{ marginBottom: 12 }}>{message}</Callout>}

      {activeTab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button large intent="primary" icon="media" onClick={handleSaveImage} loading={loading}>Save PNG</Button>
          <Button large intent="primary" icon="document" onClick={handleSavePDF} loading={loading}>Save PDF</Button>
          <Divider />
          <Button large intent="success" icon="code" onClick={handleSaveJSON} loading={loading}>Save JSON</Button>
        </div>
      )}

      {activeTab === 'python' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Button large intent="success" icon="export" onClick={exportTemplateForPython} loading={loading}>
            Export for Python
          </Button>
          <Pre style={{ marginTop: 10, fontSize: 10 }}>
            {`# Process in Python:
import base64
from PIL import Image
# Load JSON, decode background, draw variables`}
          </Pre>
        </div>
      )}

      {activeTab === 'json' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Button intent="primary" onClick={showRawJson} fill style={{ marginBottom: 10 }}>Load JSON</Button>
          {jsonText && (
            <div style={{ flex: 1, overflow: 'auto', background: '#1a1a1b', padding: 8 }}>
              <Pre style={{ fontSize: 10, color: '#aaa' }}>{jsonText}</Pre>
            </div>
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
