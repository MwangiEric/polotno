import React, { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { InputGroup, HTMLSelect, Button, Spinner, Callout } from '@blueprintjs/core';
import { ImagesGrid } from 'polotno/side-panel/images-grid';
import { SectionTab } from 'polotno/side-panel';
import FaImages from '@meronex/icons/fa/FaImages';

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

    // Prevent API calls for very short queries
    if (!safeQuery || safeQuery.length < 2) {
      return;
    }

    setLoading(true);
    setError(null);

    let searchQuery = safeQuery;
    if (assetType === 'backgrounds') {
      searchQuery += ' high resolution background';
    }

    const encodedQuery = encodeURIComponent(searchQuery);
    // FIXED: Corrected template literal syntax from \( \) to ${ }
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
    const timer = setTimeout(() => {
      fetchAssets();
    }, 600);
    return () => clearTimeout(timer);
  }, [fetchAssets]);

  const clearResults = () => {
    setQuery('');
    setImages([]);
    setError(null);
  };

  const addToCanvasCenter = async (item) => {
    const fullSrc = item.full || item.thumbnail;
    if (!fullSrc) return;

    // Use store.waitLoading if you want to show a global loader, 
    // but for simple adding, we calculate dimensions:
    const canvasWidth = store.width;
    const canvasHeight = store.height;
    
    // Default size to 50% of canvas or a fixed value
    const width = canvasWidth * 0.5;

    store.activePage.addElement({
      type: 'image',
      src: fullSrc,
      x: (canvasWidth - width) / 2,
      y: (canvasHeight - width) / 2,
      width: width,
      name: 'added-from-imagapi'
    });
  };

  const setAsBackground = () => {
    if (images.length === 0) return;

    const first = images[0].full || images[0].thumbnail;

    // Polotno standard for setting background image on the first page
    store.pages[0].set({
      background: first
    });
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '12px',
    }}>
      <HTMLSelect
        fill
        large
        value={assetType}
        onChange={e => {
          const newType = e.target.value;
          setAssetType(newType);
          const def = ASSET_TYPES.find(t => t.value === newType)?.defaultQuery || '';
          setQuery(def);
          setImages([]);
        }}
        style={{ marginBottom: '12px' }}
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
            <Button minimal icon="cross" onClick={clearResults} />
          )
        }
        style={{ marginBottom: '12px' }}
      />

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <Button
          intent="primary"
          fill
          icon="layer-outline"
          onClick={setAsBackground}
          disabled={images.length === 0 || loading}
        >
          Use First as Background
        </Button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <Spinner size={30} />
          <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>Searching...</div>
        </div>
      )}

      {error && (
        <Callout intent="danger" style={{ marginBottom: '16px', fontSize: '12px' }}>
          {error}
        </Callout>
      )}

      {!loading && !error && images.length === 0 && query.trim() && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
          No results found for "{query}"
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ImagesGrid
          // FIXED: Corrected template literal syntax
          key={`${assetType}-${query}`}
          images={images}
          getPreview={img => img.thumbnail}
          isLoading={loading}
          onSelect={addToCanvasCenter}
          rowsNumber={2} // Better for side panels than 4 or 6
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
