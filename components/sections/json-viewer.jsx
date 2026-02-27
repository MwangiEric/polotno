// src/sections/json-viewer.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { 
  Button, 
  Callout, 
  InputGroup, 
  Pre, 
  Dialog, 
  Classes, 
  FormGroup, 
  Spinner, 
  NonIdealState,
  Divider
} from '@blueprintjs/core';
import FaCode from '@meronex/icons/fa/FaCode';

export const JsonViewerPanel = observer(({ store }) => {
  const [jsonText, setJsonText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

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

  const startTemplateExport = () => {
    setIsExportDialogOpen(true);
    setTemplateName('');
    setMessage('');
  };

  const confirmExport = async () => {
    if (!templateName.trim()) {
      setMessage('Template name is required.');
      return;
    }

    setLoading(true);
    setMessage('Processing layers and generating background...');

    try {
      const page = store.activePage;
      
      // 1. Identify variables and remember their original visibility state
      const variableElements = page.children.filter(el => 
        el.name && typeof el.name === 'string' && el.name.startsWith('{{') && el.name.endsWith('}}')
      );

      const originalStates = variableElements.map(el => ({
        el,
        wasVisible: el.visible
      }));

      // 2. Hide all variables to get a "Clean" background
      variableElements.forEach(el => el.set({ visible: false }));

      // 3. Export high-res background
      const base64PNG = await store.toDataURL({
        pageId: page.id,
        mimeType: 'image/png',
        quality: 1,
        pixelRatio: 2 // High quality for Python processing
      });

      // 4. Restore visibility to EXACTLY what it was before
      originalStates.forEach(state => {
        state.el.set({ visible: state.wasVisible });
      });

      // 5. Build structured JSON with Layer/Z-Index info
      const textVars = [];
      const imageVars = [];

      // We use the page.children index to maintain relative layering in Python
      variableElements.forEach((el) => {
        const base = {
          placeholder: el.name,
          zIndex: page.children.indexOf(el), // Critical for correct overlapping
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation || 0,
          opacity: el.opacity !== undefined ? el.opacity : 1,
        };

        if (el.type === 'text') {
          textVars.push({
            ...base,
            fontSize: el.fontSize,
            fill: el.fill,
            align: el.align || 'left',
            text: el.text,
            fontFamily: el.fontFamily,
            fontStyle: el.fontStyle || 'normal',
            fontWeight: el.fontWeight || 'normal',
            lineHeight: el.lineHeight || 1,
            letterSpacing: el.letterSpacing || 0
          });
        } else if (el.type === 'image') {
          imageVars.push({
            ...base,
            keepRatio: el.keepRatio !== false,
            cropX: el.cropX || 0,
            cropY: el.cropY || 0,
            cropWidth: el.cropWidth || 1,
            cropHeight: el.cropHeight || 1,
            src: el.src // Useful if Python needs to reference the original
          });
        }
      });

      const templateJSON = {
        meta: {
          templateName: templateName.trim(),
          exportDate: new Date().toISOString(),
          app: "Polotno-Python-Bridge"
        },
        canvas: {
          width: store.width,
          height: store.height
        },
        variables: {
          text: textVars,
          image: imageVars
        }
      };

      // 6. Trigger Downloads
      const safeName = templateName.trim().replace(/\s+/g, '_');
      
      // Download JSON (Metadata)
      const jsonBlob = new Blob([JSON.stringify(templateJSON, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `${safeName}_config.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);

      // Download Background
      const pngResponse = await fetch(base64PNG);
      const pngBlob = await pngResponse.blob();
      const pngUrl = URL.createObjectURL(pngBlob);
      const pngLink = document.createElement('a');
      pngLink.href = pngUrl;
      pngLink.download = `${safeName}_background.png`;
      document.body.appendChild(pngLink);
      pngLink.click();
      document.body.removeChild(pngLink);
      URL.revokeObjectURL(pngUrl);

      setMessage(`Export Complete! Files: ${safeName}_config.json and background.png`);
      setTimeout(() => setIsExportDialogOpen(false), 2000);

    } catch (err) {
      console.error('Export Error:', err);
      setMessage('Export failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      overflow: 'hidden',
      width: '100%',
      backgroundColor: '#f5f8fa'
    }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Asset Pipeline</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <Button
          intent="primary"
          large
          fill
          icon="code"
          onClick={showRawJson}
        >
          View Raw State
        </Button>

        <Button
          intent="success"
          large
          fill
          icon="export"
          onClick={startTemplateExport}
        >
          Python Automation Export
        </Button>

        {jsonText && (
           <Button
           minimal
           small
           intent="danger"
           icon="trash"
           onClick={() => setJsonText('')}
         >
           Clear Viewer
         </Button>
        )}
      </div>

      <Divider />

      {jsonText ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', marginTop: 15 }}>
          <InputGroup
            leftIcon="search"
            placeholder='Filter keys...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <div style={{
            flex: 1,
            overflow: 'auto',
            border: '1px solid #ced9e0',
            borderRadius: 4,
            background: '#ffffff',
            padding: 12,
          }}>
            <Pre style={{
              margin: 0,
              fontSize: '12px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
            }}>
              {filteredLines || '// No matches found'}
            </Pre>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 40 }}>
            <NonIdealState 
                icon="document-share"
                title="No Data Loaded"
                description="Load the canvas state or prepare a Python export package."
            />
        </div>
      )}

      {/* Export Dialog */}
      <Dialog
        isOpen={isExportDialogOpen}
        onClose={() => !loading && setIsExportDialogOpen(false)}
        title="Prepare Python Assets"
        canOutsideClickClose={!loading}
      >
        <div className={Classes.DIALOG_BODY}>
          <FormGroup 
            label="Internal Template Name" 
            helperText="Used for file naming (e.g., 'Real_Estate_Banner')"
          >
            <InputGroup
              large
              placeholder="Enter name..."
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              disabled={loading}
            />
          </FormGroup>

          <Callout intent="info" title="What happens next?">
            <ul style={{ paddingLeft: 20, margin: '10px 0' }}>
              <li>Variables tagged with <b>{"{{name}}"}</b> will be mapped.</li>
              <li>A high-res background PNG (2x scale) will be generated.</li>
              <li>A JSON config with precise coordinates will be created.</li>
            </ul>
          </Callout>

          {loading && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
                <Spinner size={40} />
                <p style={{ marginTop: 10 }}>{message}</p>
            </div>
          )}

          {!loading && message && (
            <Callout intent={message.includes('Success') ? "success" : "danger"} style={{ marginTop: 16 }}>
              {message}
            </Callout>
          )}
        </div>

        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={() => setIsExportDialogOpen(false)} disabled={loading}>Cancel</Button>
            <Button 
              intent="success" 
              onClick={confirmExport} 
              disabled={loading || !templateName.trim()}
              loading={loading}
            >
              Generate Assets
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
});

export const JsonViewerSection = {
  name: 'json-viewer',
  Tab: (props) => (
    <SectionTab name="JSON" {...props}>
      <FaCode />
    </SectionTab>
  ),
  Panel: JsonViewerPanel,
  visibleInList: true,
};
