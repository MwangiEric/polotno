// components/sections/free-icons.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, HTMLSelect, ButtonGroup, Button, NumericInput, Colors } from '@blueprintjs/core';

// List of \~100 free Phosphor icon names (MIT license, public CDN)
const FREE_ICONS = [
  'house', 'house-line', 'star', 'star-fill', 'heart', 'heart-fill', 'user', 'user-circle', 
  'users', 'shopping-cart', 'shopping-bag', 'camera', 'camera-rotate', 'envelope', 'envelope-open',
  'phone', 'phone-call', 'map-pin', 'map-pin-area', 'calendar', 'calendar-blank', 'clock', 'clock-afternoon',
  'tag', 'tag-simple', 'truck', 'gift', 'award', 'medal', 'shield-check', 'shield-checkered',
  'thumbs-up', 'thumbs-down', 'sparkle', 'rocket', 'lightbulb', 'lightbulb-filament', 'warning', 'warning-circle',
  'info', 'info-circle', 'check-circle', 'x-circle', 'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
  'arrow-fat-right', 'download', 'upload', 'trash', 'trash-simple', 'pencil', 'pencil-simple', 'eye', 'eye-slash',
  'gear', 'gear-six', 'bell', 'bell-ringing', 'bookmark', 'bookmark-simple', 'book', 'book-open',
  'music-note', 'music-notes', 'video', 'video-camera', 'image', 'images', 'chart-bar', 'chart-line',
  'wallet', 'credit-card', 'bank', 'airplane', 'car', 'car-profile', 'train', 'bus',
  'wifi-high', 'wifi-low', 'battery-full', 'battery-warning', 'moon', 'sun', 'sun-horizon', 'cloud',
  'cloud-rain', 'lightning', 'thermometer', 'drop', 'drop-half', 'leaf', 'tree', 'flower',
  'paw-print', 'dog', 'cat', 'bird', 'fish', 'mountains', 'wave', 'wave-saw', 'circles-three',
  'cube', 'cube-transparent', 'square', 'circle', 'triangle', 'hexagon', 'pentagon', 'star-four-points'
  // You can easily add 100–200 more from https://phosphoricons.com
];

export const FreeIconsPanel = observer(({ store }) => {
  const [search, setSearch] = useState('');
  const [sizePreset, setSizePreset] = useState('medium');
  const [customSize, setCustomSize] = useState(128);
  const [color, setColor] = useState('#000000');

  // Simple real-time filter
  const lowerSearch = search.toLowerCase().trim();
  const filteredIcons = FREE_ICONS.filter(name => 
    name.toLowerCase().includes(lowerSearch)
  );

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
    const url = `https://unpkg.com/@phosphor-icons/web@2.1.0/src/icons/${name}-bold.svg`;

    store.activePage.addElement({
      type: 'svg',
      src: url,
      x: store.width / 2 - size / 2,
      y: store.height / 2 - size / 2,
      width: size,
      height: size,
      keepRatio: true,
      name: `icon-${name}`,
      fill: color
    });
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3>Free Icons Set</h3>

      {/* Search */}
      <InputGroup
        large
        leftIcon="search"
        placeholder='Search icons (house, heart, user...)'
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {/* Size controls */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Size</label>
        <ButtonGroup fill>
          <Button active={sizePreset === 'small'} onClick={() => setSizePreset('small')}>Small (64)</Button>
          <Button active={sizePreset === 'medium'} onClick={() => setSizePreset('medium')}>Medium (128)</Button>
          <Button active={sizePreset === 'large'} onClick={() => setSizePreset('large')}>Large (256)</Button>
        </ButtonGroup>

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
      </div>

      {/* Color picker (simple swatches + hex) */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Color</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
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
                src={`https://unpkg.com/@phosphor-icons/web@2.1.0/src/icons/${name}-bold.svg`}
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
            No icons found for '{search}'
          </div>
        )}
      </div>
    </div>
  );
});

// Simple hue approximation for tinting (no extra libs)
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