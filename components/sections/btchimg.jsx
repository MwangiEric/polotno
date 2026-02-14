import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import {
  Tabs, Tab,
  TextArea, Button, Callout, RadioGroup, Radio,
  NumericInput, InputGroup, Label,
  HTMLTable, Switch
} from '@blueprintjs/core';
import FaImages from '@meronex/icons/fa/FaImages';

const PROXY = "https://cors.ericmwangi13.workers.dev/?url=";

export const BtchImgPanel = observer(({ store }) => {
  const [activeTab, setActiveTab] = useState('products');
  const [inputType, setInputType] = useState('paste');
  const [pasteContent, setPasteContent] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [status, setStatus] = useState('');

  // Products columns
  const [prodColName, setProdColName] = useState(4);
  const [prodColPrice, setProdColPrice] = useState(5);
  const [prodColUrl, setProdColUrl] = useState(6);

  // Quotes columns
  const [quoteColText, setQuoteColText] = useState(1);
  const [quoteColAuthor, setQuoteColAuthor] = useState(2);

  // Educational columns
  const [eduColMain, setEduColMain] = useState(1);
  const [eduColSubs, setEduColSubs] = useState('2,3,4');

  // Proxy toggle for product images
  const [useProxy, setUseProxy] = useState(true);

  const parseCsv = (text) => {
    const lines = text.trim().split('\n');
    return lines.map(line => {
      const fields = [];
      let field = '';
      let inQuotes = false;
      for (let char of line) {
        if (char === '"' && !inQuotes) inQuotes = true;
        else if (char === '"' && inQuotes) inQuotes = false;
        else if (char === ',' && !inQuotes) {
          fields.push(field.trim());
          field = '';
        } else {
          field += char;
        }
      }
      fields.push(field.trim());
      return fields;
    });
  };

  const loadPreview = async () => {
    let rows = [];
    if (inputType === 'paste') {
      rows = pasteContent
        .trim()
        .split('\n')
        .map(l => l.trim())
        .filter(l => l)
        .map(line => line.split(','));
    } else if (inputType === 'csv' && csvFile) {
      const text = await csvFile.text();
      rows = parseCsv(text);
    }

    setPreviewRows(rows.slice(0, 3));
    setStatus(rows.length > 0 ? `Preview loaded (${rows.length} total rows)` : 'No data found');
  };

  const getSafeImageUrl = (url) => {
    if (!url) return '';
    return useProxy ? `\( {PROXY} \){encodeURIComponent(url)}` : url;
  };

  const generateBatch = async () => {
    if (previewRows.length === 0) {
      setStatus('Load preview first');
      return;
    }

    setStatus('Processing...');

    const templateSnapshot = store.toJSON();

    for (const [i, row] of previewRows.entries()) {
      try {
        store.loadJSON(templateSnapshot);
        await new Promise(r => setTimeout(r, 800));

        let name = '', price = '', url = '';
        let quote = '', author = '';
        let mainTopic = '', subtopics = [];

        if (activeTab === 'products') {
          name = row[prodColName - 1] || '';
          price = row[prodColPrice - 1] || '';
          url = row[prodColUrl - 1] || '';

          const safeUrl = getSafeImageUrl(url);

          store.pages.forEach(page => {
            page.children.forEach(el => {
              if (el.type === 'text') {
                if (el.text === '{product_name}') el.set({ text: name || '[No Name]' });
                if (el.text === '{price}') el.set({ text: price ? `KSh ${price}` : '[No Price]' });
              }
              if (el.type === 'image' && el.name === 'product_image_placeholder') {
                el.set({ src: safeUrl });
              }
            });
          });
        } else {
          if (row.length === 1) {
            quote = row[0] || '';
          } else if (row.length === 2) {
            quote = row[quoteColText - 1] || '';
            author = row[quoteColAuthor - 1] || '';
          } else {
            mainTopic = row[eduColMain - 1] || '';
            const subCols = eduColSubs.split(',').map(c => parseInt(c.trim()) - 1);
            subtopics = subCols.map(idx => row[idx] || '');
          }

          store.pages.forEach(page => {
            page.children.forEach(el => {
              if (el.type === 'text') {
                if (el.text === '{quote_text}' || el.text === '{product_name}') {
                  el.set({ text: quote || mainTopic || '[No Text]' });
                }
                if (el.text === '{quote_author}' || el.text === '{price}') {
                  el.set({ text: author || '' });
                }
                subtopics.forEach((sub, idx) => {
                  if (el.text === `{sub${idx + 1}}`) {
                    el.set({ text: sub });
                  }
                });
              }
            });
          });
        }

        await new Promise(r => setTimeout(r, 1500));

        const dataUrl = await store.toDataURL({ pixelRatio: 1.5 });

        const filename = activeTab === 'products'
          ? `\( {name.replace(/\s+/g, '-')} \){price ? '-' + price : ''}.png`
          : activeTab === 'quotes'
          ? `quote-\( {i + 1}- \){(quote || mainTopic).slice(0, 20).replace(/\s+/g, '-')}.png`
          : `topic-${i + 1}.png`;

        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        a.click();

        setStatus(`Downloaded \( {i + 1}/ \){previewRows.length}`);
      } catch (err) {
        setStatus(`Error on row ${i + 1}: ${err.message}`);
        console.error(err);
      }
    }

    setStatus(`Done – ${previewRows.length} items exported`);
  };

  return (
    <div style={{ padding: 20, height: '100%', overflow: 'auto' }}>
      <h3>Batch Image Export</h3>

      <Tabs
        id="batch-tabs"
        selectedTabId={activeTab}
        onChange={setActiveTab}
        large
        animate={false}
      >
        <Tab id="products" title="Products" />
        <Tab id="quotes" title="Quotes / Educational" />
      </Tabs>

      <Callout intent="primary" style={{ margin: '16px 0' }}>
        <strong>Instructions</strong><br />
        1. Choose input method (paste or CSV)<br />
        2. Load preview to see first 3 rows<br />
        3. Assign correct column numbers (1-based)<br />
        4. Click Generate
      </Callout>

      {/* Proxy toggle */}
      {activeTab === 'products' && (
        <Switch
          checked={useProxy}
          label="Use CORS proxy for product images"
          onChange={() => setUseProxy(!useProxy)}
          style={{ marginBottom: 16 }}
        />
      )}

      <RadioGroup
        inline
        label="Input Method"
        selectedValue={inputType}
        onChange={e => setInputType(e.target.value)}
        style={{ marginBottom: 16 }}
      >
        <Radio label="Paste" value="paste" />
        <Radio label="Upload CSV" value="csv" />
      </RadioGroup>

      {inputType === 'paste' ? (
        <TextArea
          fill
          growVertically
          placeholder="Paste your list here (one row per line)"
          value={pasteContent}
          onChange={e => setPasteContent(e.target.value)}
          style={{ minHeight: 140, marginBottom: 12 }}
        />
      ) : (
        <InputGroup
          type="file"
          accept=".csv,.txt"
          onChange={e => setCsvFile(e.target.files[0] || null)}
          style={{ marginBottom: 12 }}
        />
      )}

      <Button
        intent="primary"
        onClick={loadPreview}
        disabled={(inputType === 'paste' && !pasteContent.trim()) || (inputType === 'csv' && !csvFile)}
        style={{ marginBottom: 16 }}
      >
        Load Preview (first 3 rows)
      </Button>

      {previewRows.length > 0 && (
        <>
          <Callout intent="success" style={{ marginBottom: 16 }}>
            Preview loaded ({previewRows.length} rows shown — first 3 rows)
          </Callout>

          <HTMLTable condensed striped style={{ width: '100%', marginBottom: 16 }}>
            <thead>
              <tr>
                <th>Row</th>
                {previewRows[0]?.map((_, idx) => (
                  <th key={idx}>Col {idx + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td>{rowIdx + 1}</td>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </HTMLTable>

          {activeTab === 'products' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <Label>Name column</Label>
                <NumericInput value={prodColName} onValueChange={setProdColName} min={1} fill />
              </div>
              <div>
                <Label>Price column</Label>
                <NumericInput value={prodColPrice} onValueChange={setProdColPrice} min={1} fill />
              </div>
              <div>
                <Label>URL column</Label>
                <NumericInput value={prodColUrl} onValueChange={setProdColUrl} min={1} fill />
              </div>
            </div>
          )}

          {activeTab === 'quotes' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <Label>Quote / Main Topic column</Label>
                <NumericInput value={quoteColText} onValueChange={setQuoteColText} min={1} fill />
              </div>
              <div>
                <Label>Author column (optional)</Label>
                <NumericInput value={quoteColAuthor} onValueChange={setQuoteColAuthor} min={1} fill />
              </div>
            </div>
          )}
        </>
      )}

      <Button
        intent="success"
        large
        fill
        onClick={generateBatch}
        disabled={previewRows.length === 0}
      >
        Generate & Download Images
      </Button>

      {status && (
        <Callout intent="primary" style={{ marginTop: 16 }}>
          {status}
        </Callout>
      )}
    </div>
  );
});

export const BtchImgSection = {
  name: 'batch-images',
  Tab: props => (
    <SectionTab name="Batch Images" {...props}>
      <FaImages style={{ marginInline: 'auto' }} />
    </SectionTab>
  ),
  Panel: BtchImgPanel,
  visibleInList: true,
};