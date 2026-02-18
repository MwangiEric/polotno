// components/sections/free-icons.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, ButtonGroup, Button, NumericInput, Colors } from '@blueprintjs/core';

// Popular Phosphor icon names (expand this list as needed)
const ICON_NAMES = [
  'house', 'star', 'heart', 'user', 'shopping-cart', 'camera', 'envelope', 'phone', 'map-pin', 'calendar',
  'clock', 'tag', 'truck', 'gift', 'award', 'shield-check', 'thumbs-up', 'sparkle', 'rocket', 'lightbulb',
  'warning', 'info', 'check-circle', 'x-circle', 'arrow-right', 'arrow-left', 'download', 'upload', 'trash',
  'pencil', 'eye', 'eye-slash', 'gear', 'bell', 'bookmark', 'book', 'music-note', 'video', 'image',
  'chart-bar', 'chart-line', 'wallet', 'credit-card', 'bank', 'airplane', 'car', 'train', 'bus',
  'wifi-high', 'battery-full', 'moon', 'sun', 'cloud', 'lightning', 'thermometer', 'drop', 'leaf',
  'flower', 'paw-print', 'dog', 'cat', 'bird', 'fish', 'tree', 'mountains', 'wave', 'wave-saw'
  // Add 50–100 more from https://phosphoricons.com if you want
];

const ICON_SETS = [
  { value: 'phosphor', label: 'Phosphor Icons', baseUrl: 'https://unpkg.com/@phosphor-icons/web@2.1.0/src/icons/' },
  { value: 'lucide', label: 'Lucide Icons', baseUrl: 'https://unpkg.com/lucide-static@latest/icons/' }
];

export const FreeIconsPanel = observer(({ store }) => {
  const [setId, setSetId] = useState('phosphor');
  const [search, setSearch] = useState('');
  const [sizePreset, setSizePreset] = useState('medium');
  const [customSize, setCustomSize] = useState(128);
  const [color, setColor] = useState('#000000');

  const currentSet = ICON_SETS.find(s => s.value === setId);

  // Simple real-time filter
  const lowerSearch = search.toLowerCase().trim();
  const filteredIcons = ICON_NAMES.filter(name => 
    name.toLowerCase().includes(lowerSearch)
  );

  // Size logic
  const getSize = () => {
    switch (sizePreset) {
      case 'small': return 64;
      case 'medium': return 128;
      case 'large': return 256;
      default: return customSize;
    }
  };

  const addIcon = (name) => {
    const size = getSize();
    const url = `\( {currentSet.baseUrl} \){name}.svg`; // Phosphor regular style (add -bold etc. if wanted)

    store.activePage.addElement({
      type: 'svg',
      src: url,
      x: store.width / 2 - size / 2,
      y: store.height / 2 - size / 2,
      width: size,
      height: size,
      keepRatio: true,
      name: `icon-${name}`,
      fill: color // Applies tint (works best with monochrome icons)
    });
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3>Icons Set</h3>

      {/* Set selector */}
      <HTMLSelect
        fill
        value={setId}
        onChange={e => setSetId(e.target.value)}
        style={{ marginBottom: 12 }}
      >
        {ICON_SETS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </HTMLSelect>

      {/* Search */}
      <InputGroup
        large
        leftIcon="search"
        placeholder="Search icons (house, heart, user...)"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {/* Size controls */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Icon Size</label>
        <ButtonGroup fill>
          <Button active={sizePreset === 'small'} onClick={() => setSizePreset('small')}>Small (64px)</Button>
          <Button active={sizePreset === 'medium'} onClick={() => setSizePreset('medium')}>Medium (128px)</Button>
          <Button active={sizePreset === 'large'} onClick={() => setSizePreset('large')}>Large (256px)</Button>
        </ButtonGroup>

        {sizePreset === 'custom' && (
          <div style={{ marginTop: 12 }}>
            <NumericInput
              fill
              value={customSize}
              onValueChange={setCustomSize}
              min={32}
              max={512}
              step={16}
              majorStepSize={64}
              leftIcon="widget-button"
              rightElement={<Button minimal icon="refresh" onClick={() => setCustomSize(128)} />}
            />
          </div>
        )}
      </div>

      {/* Color picker (Blueprint built-in swatches + hex input) */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Icon Color</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            Colors.BLUE3, Colors.GREEN3, Colors.RED3, Colors.ORANGE3, Colors.VIOLET3,
            Colors.DARK_GRAY5, Colors.BLACK, Colors.WHITE, Colors.GRAY3
          ].map(c => (
            <div
              key={c}
              style={{
                width: 32,
                height: 32,
                backgroundColor: c,
                border: color === c ? '3px solid #fff' : '1px solid #ddd',
                borderRadius: 6,
                cursor: 'pointer',
                boxShadow: color === c ? '0 0 0 3px rgba(0,0,0,0.2)' : 'none'
              }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <InputGroup
          value={color}
          onChange={e => setColor(e.target.value)}
          placeholder="#000000"
          style={{ marginTop: 12 }}
          leftElement={<div style={{ background: color, width: 20, height: 20, borderRadius: 4, margin: 6 }} />}
        />
      </div>

      {/* Icons grid */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 12 }}>
          {filteredIcons.map(name => (
            <div
              key={name}
              style={{
                textAlign: 'center',
                cursor: 'pointer',
                padding: 8,
                borderRadius: 8,
                background: '#f8f9fa',
                transition: 'all 0.15s'
              }}
              onClick={() => addIcon(name)}
              onMouseEnter={e => e.currentTarget.style.background = '#e0f0ff'}
              onMouseLeave={e => e.currentTarget.style.background = '#f8f9fa'}
            >
              <img
                src={`\( {currentSet.baseUrl} \){name}.svg`}
                alt={name}
                style={{ 
                  width: 48, 
                  height: 48,
                  filter: color !== '#000000' ? `hue-rotate(${getHue(color)}deg) saturate(200%)` : 'none'
                }}
              />
              <div style={{ fontSize: 11, marginTop: 6, color: '#555' }}>
                {name.replace(/-/g, ' ')}
              </div>
            </div>
          ))}
        </div>

        {filteredIcons.length === 0 && search && (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            No icons found for "{search}"
          </div>
        )}
      </div>
    </div>
  );
});

// Very simple hue approximation for tinting (not perfect, but no extra libs)
function getHue(hex) {
  if (!hex || hex.length < 7) return 0;
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0;
  if (max === min) return 0;
  const d = max - min;
  switch (max) {
    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
    case g: h = (b - r) / d + 2; break;
    case b: h = (r - g) / d + 4; break;
  }
  return Math.round(h * 60);
}

export const FreeIconsSection = {
  name: 'free-icons',
  Tab: (props) => (
    <SectionTab name="Icons Set" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    </SectionTab>
  ),
  Panel: FreeIconsPanel,
};