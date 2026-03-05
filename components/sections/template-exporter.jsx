// components/sections/template-exporter.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { Button, Callout } from '@blueprintjs/core';

export const TemplateExporterPanel = observer(({ store }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  const exportTemplateForPython = async () => {
    setLoading(true);
    setMessage('Preparing export...');
    setDebugInfo('');

    try {
      const page = store.activePage;
      
      // DEBUG: Log all elements to see what we're working with
      console.log('All page children:', page.children);
      
      // Step 1: Find all variable elements - check BOTH name AND text content
      const variableElements = page.children.filter(el => {
        const name = el.name || '';
        const text = el.text || '';
        
        // Check if name is a variable like {{name}}, {{price}}, {{image1}}
        const isNameVariable = name.startsWith('{{') && name.endsWith('}}');
        
        // Also check if text content is a variable (for text elements)
        const isTextVariable = text.startsWith('{{') && text.endsWith('}}');
        
        // Check element type for debugging
        const isVariable = isNameVariable || isTextVariable;
        
        if (isVariable) {
          console.log('Found variable:', {
            name: el.name,
            text: el.text,
            type: el.type,
            isNameVariable,
            isTextVariable
          });
        }
        
        return isVariable;
      });

      console.log(`Found ${variableElements.length} variable elements:`, 
        variableElements.map(el => ({ name: el.name, text: el.text, type: el.type }))
      );

      setDebugInfo(`Found ${variableElements.length} variables: ${variableElements.map(e => e.name || e.text).join(', ')}`);

      if (variableElements.length === 0) {
        setMessage('No variables found! Make sure elements are named {{name}}, {{price}}, etc.');
        setLoading(false);
        return;
      }

      // Step 2: Record their properties BEFORE hiding
      const variables = variableElements.map(el => {
        const varName = el.name || el.text || 'unknown'; // Use name or text as identifier
        const baseProps = {
          name: varName,
          type: el.type,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation || 0,
          opacity: el.opacity !== undefined ? el.opacity : 1,
          visible: el.visible !== false,
        };

        // Text-specific properties
        if (el.type === 'text') {
          return {
            ...baseProps,
            fontSize: el.fontSize || 24,
            fill: el.fill || '#000000',
            fontFamily: el.fontFamily || 'Arial',
            fontStyle: el.fontStyle || 'normal',
            fontWeight: el.fontWeight || 'normal',
            textAlign: el.align || 'left',
            placeholderText: el.text || ''    // The placeholder text like "{{name}}"
          };
        }
        
        // Image-specific properties
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

      // Step 3: Hide all variable elements
      console.log('Hiding variables...');
      variableElements.forEach((el, idx) => {
        console.log(`Hiding ${idx + 1}/${variableElements.length}:`, el.name || el.text);
        el.set({ visible: false });
      });

      // Give Polotno a moment to re-render without variables
      await new Promise(resolve => setTimeout(resolve, 100));

      setMessage(`Exporting clean background (${variableElements.length} variables hidden)...`);

      // Step 4: Export clean base PNG (without variable elements)
      const base64PNG = await store.toDataURL({
        pageId: page.id,
        mimeType: 'image/png',
        quality: 1,
        pixelRatio: 2
      });

      // Step 5: Create comprehensive JSON for Python
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

      // Step 6: Download JSON
      const jsonBlob = new Blob([JSON.stringify(templateJSON, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = 'template.json';
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);

      // Step 7: Download clean base PNG separately
      const pngBlob = await fetch(base64PNG).then(r => r.blob());
      const pngUrl = URL.createObjectURL(pngBlob);
      const pngLink = document.createElement('a');
      pngLink.href = pngUrl;
      pngLink.download = 'background.png';
      document.body.appendChild(pngLink);
      pngLink.click();
      document.body.removeChild(pngLink);
      URL.revokeObjectURL(pngUrl);

      // Step 8: CRITICAL - Restore visibility of all variables
      console.log('Restoring variables...');
      variableElements.forEach((el, idx) => {
        console.log(`Restoring ${idx + 1}/${variableElements.length}:`, el.name || el.text);
        el.set({ visible: true });
      });

      setMessage(`Export complete! ${variables.length} variables saved.`);

    } catch (err) {
      console.error('Export error:', err);
      setMessage('Export failed: ' + err.message);
      
      // Ensure variables are restored even on error
      try {
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
      } catch (restoreErr) {
        console.error('Failed to restore variables:', restoreErr);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', padding: 20, display: 'flex', flexDirection: 'column' }}>
      <h3>Template Exporter for Python</h3>
      <p style={{ color: '#aaa', marginBottom: 20 }}>
        Hides all {'{{variables}}'} and exports clean background + positions.
      </p>

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
        style={{ marginTop: 'auto', marginBottom: 20, height: 60, fontSize: 18 }}
      >
        {loading ? 'Exporting...' : 'Export Template for Python'}
      </Button>

      {message && (
        <Callout 
          intent={message.includes('failed') || message.includes('No variables') ? 'warning' : 'success'} 
          style={{ marginBottom: 20 }}
        >
          {message}
        </Callout>
      )}

      <div style={{ 
        padding: 16, 
        background: '#111', 
        borderRadius: 12, 
        fontSize: 12, 
        color: '#888'
      }}>
        <strong>How to name variables:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
          <li>Text elements: Set <strong>name</strong> to {'{{name}}'}, {'{{price}}'}, etc.</li>
          <li>OR set the <strong>text content</strong> to {'{{name}}'}, {'{{price}}'}, etc.</li>
          <li>Image elements: Set <strong>name</strong> to {'{{image1}}'}, {'{{image2}}'}, etc.</li>
        </ul>
        Check browser console (F12) for debug logs.
      </div>
    </div>
  );
});

export const TemplateExporterSection = {
  name: 'template-exporter',
  Tab: (props) => (
    <SectionTab name="Template Exporter" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
      </svg>
    </SectionTab>
  ),
  Panel: TemplateExporterPanel,
};