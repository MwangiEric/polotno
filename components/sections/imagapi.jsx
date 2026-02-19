// components/sections/imagapi.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { InputGroup, HTMLSelect, Button, Spinner, Callout } from '@blueprintjs/core';
import { ImagesGrid } from 'polotno/side-panel/images-grid';
import { SectionTab } from 'polotno/side-panel';
import FaImages from '@meronex/icons/fa/FaImages';

// Suppress <img> warnings for this component
/* eslint-disable @next/next/no-img-element */

const ASSET_TYPES = [
  { value: 'backgrounds',   label: 'Backgrounds',   defaultQuery: 'abstract gradient' },
  { value: 'icons',         label: 'Icons',         defaultQuery: 'minimal icon' },
  { value: 'textures',      label: 'Textures',      defaultQuery: 'paper texture' },
  { value: 'patterns',      label: 'Patterns',      defaultQuery: 'geometric pattern' },
  { value: 'gradients',     label: 'Gradients',     defaultQuery: 'blue gradient' },
  { value: 'illustrations', label: 'Illustrations', defaultQuery: 'abstract illustration' },
  { value: 'mockups',       label: 'Mockups',       defaultQuery: 'phone mockup' },
  { value: 'stock_photos',  label: 'Stock Photos',  defaultQuery: 'business' },
];

export const ImagApiPanel = observer(({ store }) => {
  const [assetType, setAssetType] = useState(ASSET_TYPES[0].value);
  const [query, setQuery] = useState(ASSET_TYPES[0].defaultQuery);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const selectedType = ASSET_TYPES.find(t => t.value === assetType);

  const fetchAssets = useCallback(async () => {
    const safeQuery = (query || '').trim();

    if (!safeQuery || safeQuery.length < 2) {
      setImages([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setImages([]);

    let searchQuery = safeQuery;
    if (assetType === 'backgrounds') {
      searchQuery += ' large high resolution 4k background wallpaper';
    }

    const encodedQuery = encodeURIComponent(searchQuery);
    const targetUrl = `https://imagapi.vercel.app/api/v1/assets/search?asset_type=${assetType}&q=${encodedQuery}&n=30`;

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();

      if (data.images && Array.isArray(data.images)) {
        const formatted = data.images.map(item => ({
          thumbnail: item.thumbnail || item.url,
          full: item.url,
          alt: item.title || `${selectedType?.label || 'item'}`
        }));
        setImages(formatted);
      } else {
        setError('Invalid response format from API');
      }
    } catch (err) {
      setError(err.message || 'Failed to load assets');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [query, assetType, selectedType]);

  useEffect(() => {
    const timer = setTimeout(fetchAssets, 600);
    return () => clearTimeout(timer);
  }, [fetchAssets]);

  const clearResults = () => {
    setQuery('');
    setImages([]);
    setError(null);
  };

  const addToCanvasCenter = (item) => {
    const fullSrc = item.full || item.thumbnail;
    if (!fullSrc) return;

    const canvasWidth = store.width;
    const canvasHeight = store.height;
    const maxSize = Math.min(canvasWidth * 0.8, canvasHeight * 0.8);
    const centerX = (canvasWidth - maxSize) / 2;
    const centerY = (canvasHeight - maxSize) / 2;

    store.activePage.addElement({
      type: 'image',
      src: fullSrc,
      x: centerX,
      y: centerY,
      width: maxSize,
      height: maxSize,
      keepRatio: true,
      name: 'added-from-imagapi'
    });
  };

  const setAsBackground = () => {
    if (images.length === 0) {
      setError('No images available');
      return;
    }

    const first = images[0].full || images[0].thumbnail;

    store.pages[0].set({
      backgroundImage: first,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: 'transparent',
    });
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: 12,
    }}>
      <HTMLSelect
        fill
        large
        value={assetType}
        onChange={e => {
          setAssetType(e.target.value);
          const def = ASSET_TYPES.find(t => t.value === e.target.value)?.defaultQuery || '';
          setQuery(def);
          setImages([]);
        }}
        style={{ marginBottom: 12 }}
      >
        {ASSET_TYPES.map(t => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </HTMLSelect>

      <InputGroup
        large
        leftIcon="search"
        placeholder={`Search ${selectedType?.label.toLowerCase() || 'assets'}...`}
        value={query}
        onChange={e => setQuery(e.target.value)}
        rightElement={
          query && (
            <Button minimal icon="cross" onClick={clearResults} small />
          )
        }
        style={{ marginBottom: 12 }}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button
          intent="primary"
          small
          onClick={setAsBackground}
          disabled={images.length === 0 || loading}
        >
          Set First as Background
        </Button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <Spinner size={40} />
          <div style={{ marginTop: 10 }}>Loading assets...</div>
        </div>
      )}

      {error && (
        <Callout intent="danger" style={{ marginBottom: 16 }}>
          {error}
        </Callout>
      )}

      {!loading && !error && images.length === 0 && query.trim() && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
          No results found
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ImagesGrid
          key={`${assetType}-${query}`}
          images={images}
          getPreview={img => img.thumbnail}
          rowsNumber={selectedType?.value === 'backgrounds' ? 4 : 6}
          isLoading={loading}
          onSelect={addToCanvasCenter}
        />
      </div>
    </div>
  );
});

export const ImagApiSection = {
  name: 'imagapi',
  Tab: (props) => (
    <SectionTab name="Assets" {...props}>
      <FaImages />
    </SectionTab>
  ),
  Panel: ImagApiPanel,
};
