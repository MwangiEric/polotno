// src/sections/json-viewer.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { Button, Callout, InputGroup, Pre, Tooltip, Dialog, Classes, FormGroup, Spinner } from '@blueprintjs/core';
import FaCode from '@meronex/icons/fa/FaCode';

export const JsonViewerPanel = observer(({ store }) => {
  const [jsonText, setJsonText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [exportPreview, setExportPreview] = useState(null);

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
    setExportPreview(null);
    setMessage('');
  };

  const prepareExportPreview = async () => {
    if (!templateName.trim()) {
      setMessage('Please enter a template name');
      return;
    }

    setLoading(true);
    setMessage('Analyzing template...');

    try {
      const page = store.activePage;
      const textVars = [];
      const imageVars = [];

      // Find variables
      const vars = page.children.filter(el => 
        el.name && el.name.startsWith('{{') && el.name.endsWith('}}')
      );

      vars.forEach(el => {
        const base = {
          placeholder: el.name,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation || 0,
          opacity: el.opacity || 1
        };

        if (el.type === 'text') {
          textVars.push({
            ...base,
            fontSize: el.fontSize || null,
            fill: el.fill || null,
            align: el.align || 'left',
            text: el.text || '',
            fontFamily: el.fontFamily || null,
            fontStyle: el.fontStyle || 'normal',
            fontWeight: el.fontWeight || 'normal',
            lineHeight: el.lineHeight || 1,
            letterSpacing: el.letterSpacing || 0
          });
        } else if (el.type === 'image') {
          imageVars.push({
            ...base,
            keepRatio: el.keepRatio || true,
            cropX: el.cropX || 0,
            cropY: el.cropY || 0,
            cropWidth: el.cropWidth || 1,
            cropHeight: el.cropHeight || 1
          });
        }
      });

      // Export clean background
      const base64 = await store.toDataURL({
        pageId: page.id,
        mimeType: 'image/png',
        quality: 1,
        pixelRatio: 2
      });

      const preview = {
        templateName: templateName.trim(),
        canvas: { width: store.width, height: store.height },
        backgroundBase64: base64.substring(0, 100) + '...' // truncated for preview
      };

      setExportPreview({ textVars, imageVars, preview });
      setMessage('Preview ready. Click Export to save files.');

    } catch (err) {
      setMessage('Failed to prepare export: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmExport = async () => {
    setLoading(true);
    setMessage('Exporting...');

    try {
      const page = store.activePage;
      const vars = page.children.filter(el => 
        el.name && el.name.startsWith('{{') && el.name.endsWith('}}')
      );

      // Hide variables
      vars.forEach(el => el.set({ visible: false }));

      // Export background
      const base64PNG = await store.toDataURL({
        pageId: page.id,
        mimeType: 'image/png',
        quality: 1,
        pixelRatio: 2
      });

      // Restore visibility
      vars.forEach(el => el.set({ visible: true }));

      // Build full JSON
      const textVars = [];
      const imageVars = [];

      vars.forEach(el => {
        const base = {
          placeholder: el.name,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation || 0,
          opacity: el.opacity || 1
        };

        if (el.type === 'text') {
          textVars.push({
            ...base,
            fontSize: el.fontSize || null,
            fill: el.fill || null,
            align: el.align || 'left',
            text: el.text || '',
            fontFamily: el.fontFamily || null,
            fontStyle: el.fontStyle || 'normal',
            fontWeight: el.fontWeight || 'normal',
            lineHeight: el.lineHeight || 1,
            letterSpacing: el.letterSpacing || 0
          });
        } else if (el.type === 'image') {
          imageVars.push({
            ...base,
            keepRatio: el.keepRatio || true,
            cropX: el.cropX || 0,
            cropY: el.cropY || 0,
            cropWidth: el.cropWidth || 1,
            cropHeight: el.cropHeight || 1
          });
        }
      });

      const templateJSON = {
        templateName: templateName.trim(),
        canvas: {
          width: store.width,
          height: store.height
        },
        background: {
          base64: base64PNG,
          filename: 'background.png'
        },
        variables: {
          text: textVars,
          image: imageVars
        }
      };

      // Download JSON
      const jsonBlob = new Blob([JSON.stringify(templateJSON, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `${templateName.trim().replace(/\s+/g, '_')}_template.json`;
      jsonLink.click();
      URL.revokeObjectURL(jsonUrl);

      // Download background
      const pngBlob = await fetch(base64PNG).then(r => r.blob());
      const pngUrl = URL.createObjectURL(pngBlob);
      const pngLink = document.createElement('a');
      pngLink.href = pngUrl;
      pngLink.download = 'background.png';
      pngLink.click();
      URL.revokeObjectURL(pngUrl);

      setMessage(`Success! Exported "${templateName}" template.`);

    } catch (err) {
      console.error(err);
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
      padding: 16,
      overflow: 'hidden',
      width: '100%',
    }}>
      <h3 style={{ marginTop: 0 }}>JSON Viewer + Template Exporter</h3>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <Button
          intent="primary"
          large
          onClick={showRawJson}
          style={{ flex: 1, minWidth: 180 }}
        >
          Load Current Canvas JSON
        </Button>

        <Button
          intent="success"
          large
          icon="export"
          onClick={startExport}
          style={{ flex: 1, minWidth: 220 }}
        >
          Export Template for Python
        </Button>

        <Button
          minimal
          icon="refresh"
          onClick={() => setJsonText('')}
        >
          Clear JSON
        </Button>
      </div>

      {jsonText && (
        <div style={{ marginBottom: 12 }}>
          <InputGroup
            leftIcon="search"
            placeholder='Filter JSON (type to search lines)...'
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
          Click Load Current Canvas JSON to view raw state.<br /><br />
          Or use Export Template for Python to prepare background.png + template.json for automation.
        </Callout>
      )}

      {/* Export Dialog */}
      <Dialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        title="Export Template for Python"
      >
        <div className={Classes.DIALOG_BODY}>
          <FormGroup label="Template Name" labelFor="template-name">
            <InputGroup
              id="template-name"
              large
              placeholder="e.g. Phone Basic v1"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              autoFocus
            />
          </FormGroup>

          <p style={{ marginTop: 16 }}>
            This will:
          </p>
          <ul>
            <li>Hide all {{variable}} elements</li>
            <li>Export background.png (clean canvas)</li>
            <li>Export template.json with canvas size + exact positions of text & image variables</li>
            <li>Restore visibility after export</li>
          </ul>

          {loading && <Spinner size={30} style={{ margin: '20px auto', display: 'block' }} />}
          {message && <Callout intent="primary" style={{ marginTop: 16 }}>{message}</Callout>}
        </div>

        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
            <Button 
              intent="primary" 
              onClick={confirmExport} 
              disabled={loading || !templateName.trim()}
              loading={loading}
            >
              Export Now
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
      <FaCode style={{ marginInline: 'auto' }} />
    </SectionTab>
  ),
  Panel: JsonViewerPanel,
  visibleInList: true,
};