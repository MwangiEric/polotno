// components/sections/free-icons.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, HTMLSelect, ButtonGroup, Button, NumericInput, Colors } from '@blueprintjs/core';

// Suppress Next.js <img> warnings for dynamic CDN icons
/* eslint-disable @next/next/no-img-element */

// ~100 free Phosphor icons (MIT license, public CDN)
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
];

export const FreeIconsPanel = observer(({ store }) => {
  const [search, setSearch] = useState('');
  const [sizePreset, setSizePreset] = useState('medium');
  const [customSize, setCustomSize] = useState(128);
  const [color, setColor] = useState('#000000');

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

  const addIcon = async (name) => {
    const size = getSize();
    const url = `https://unpkg.com/@phosphor-icons/web@2.1.0/src/icons/${name}-bold.svg`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch SVG');
      
      let svgText = await response.text();
      // Inject fill color directly into SVG
      svgText = svgText.replace('<svg', `<svg fill="${color}"`);

      store.activePage.addElement({
        type: 'svg',
        content: svgText, // Use 'content' for inline SVG with custom fill
        x: store.width / 2 - size / 2,
        y: store.height / 2 - size / 2,
        width: size,
        height: size,
        keepRatio: true,
        name: `icon-${name}`,
      });
    } catch (err) {
      console.error('Failed to add icon:', err);
    }
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3>Free Icons Set</h3>

      <InputGroup
        large
        leftIcon="search"
        placeholder='Search icons (house, heart, user...)'
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
      />

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

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Color</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {[
            Colors.BLUE3, Colors.GREEN3, Colors.RED3, Colors.ORANGE3, Colors.VIOLET3,
            Colors.BLACK, Colors.GRAY3, '#5C7080'
          ].map(c => (
            <div
              key={c}
              style={{
                width: 28,
                height: 28,
                backgroundColor: c,
                border: color === c ? '2px solid #333' : '1px solid #ddd',
                borderRadius: '50%',
                cursor: 'pointer',
              }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <InputGroup
          value={color}
          onChange={e => setColor(e.target.value)}
          placeholder="#000000"
          leftElement={<div style={{ background: color, width: 16, height: 16, borderRadius: 2, margin: 8, border: '1px solid #ddd' }} />}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
          {filteredIcons.map(name => (
            <div
              key={name}
              style={{
                textAlign: 'center',
                cursor: 'pointer',
                padding: '12px 8px',
                borderRadius: '8px',
                background: '#f8f9fa',
                border: '1px solid #ececec',
                transition: 'background 0.2s'
              }}
              onClick={() => addIcon(name)}
              onMouseEnter={e => e.currentTarget.style.background = '#eef4ff'}
              onMouseLeave={e => e.currentTarget.style.background = '#f8f9fa'}
            >
              <img
                src={`https://unpkg.com/@phosphor-icons/web@2.1.0/src/icons/${name}-bold.svg`}
                alt={name}
                style={{ 
                  width: 32, 
                  height: 32,
                  filter: color !== '#000000' ? 'invert(100%)' : 'none',
                  opacity: 0.8
                }}
              />
              <div style={{ fontSize: '10px', marginTop: '8px', color: '#5C7080', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </div>
            </div>
          ))}
        </div>

        {filteredIcons.length === 0 && search && (
          <div style={{ textAlign: 'center', padding: '20px', color: Colors.GRAY3 }}>
            No icons found for "{search}"
          </div>
        )}
      </div>
    </div>
  );
});

export const FreeIconsSection = {
  name: 'free-icons',
  Tab: (props) => (
    <SectionTab name="Icons" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    </SectionTab>
  ),
  Panel: FreeIconsPanel,
};
