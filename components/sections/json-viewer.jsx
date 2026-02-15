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

  const filteredLines = jsonText
    .split('\n')
    .filter(line => {
      if (!searchTerm.trim()) return true;
      return line.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .join('\n');

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
          Click Load Current Canvas JSON to see the full raw state of the current design.
          <br /><br />
          Useful for checking:
          <ul style={{ margin: '8px 0 0 20px' }}>
            <li>exact x/y/width/height of images and elements</li>
            <li>image src URLs</li>
            <li>text content and placeholders</li>
            <li>font families, colors, rotations, etc.</li>
          </ul>
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