import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { InputGroup, HTMLSelect, Button } from '@blueprintjs/core';
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
  const [status, setStatus] = useState('');

  const selectedType = ASSET_TYPES.find(t => t.value === assetType);

  const fetchAssets = async () => {
    const safeQuery = (query || '').trim();
    if (safeQuery.length < 2) {
      setImages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setStatus('Searching...');
    setImages([]);

    let searchQuery = safeQuery;
    if (assetType === 'backgrounds') {
      searchQuery += ' large high resolution 4k background wallpaper';
    }

    const targetUrl = `https://imagapi.vercel.app/api/v1/assets/search?asset_type=\( {assetType}&q= \){encodeURIComponent(searchQuery)}&n=30`;

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.images && Array.isArray(data.images)) {
        const formatted = data.images.map(item => ({
          thumbnail: item.thumbnail || item.url,
          full: item.url,
          alt: item.title || `${selectedType.label} item`
        }));
        setImages(formatted);
        setStatus(`Found ${formatted.length} results`);
      } else {
        setStatus('No images found');
      }
    } catch (err) {
      setStatus(`Search error: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchAssets, 500);
    return () => clearTimeout(timer);
  }, [query, assetType]);

  const addFullImage = (item) => {
    const fullSrc = item.full || item.thumbnail;

    const canvasWidth = store.width;
    const canvasHeight = store.height;
    const maxSize = Math.min(canvasWidth * 0.8, canvasHeight * 0.8);

    store.activePage.addElement({
      type: 'image',
      src: fullSrc,
      x: (canvasWidth - maxSize) / 2,
      y: (canvasHeight - maxSize) / 2,
      width: maxSize,
      height: maxSize,
      keepRatio: true,
    });
  };

  const setBackgroundFromFirst = () => {
    if (images.length === 0) {
      setStatus('No images to set as background');
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

    setStatus('Background set');
  };

  const clearSearch = () => {
    setQuery('');
    setImages([]);
    setStatus('');
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: 12,
      overflow: 'hidden',
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
          query && <Button minimal icon="cross" onClick={clearSearch} small />
        }
        style={{ marginBottom: 12 }}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Button
          intent="primary"
          small
          onClick={setBackgroundFromFirst}
          disabled={images.length === 0 || loading}
        >
          Set Background from First Result
        </Button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 20 }}>Loading...</div>}

      {!loading && images.length === 0 && query.trim() && (
        <div style={{ textAlign: 'center', color: '#666', padding: 20 }}>
          No results found
        </div>
      )}

      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingRight: 8,
      }}>
        <ImagesGrid
          key={`\( {assetType}- \){query}`}
          images={images}
          getPreview={img => img.thumbnail}
          rowsNumber={selectedType?.value === 'backgrounds' ? 4 : 6}
          isLoading={loading}
          onSelect={addFullImage}
          style={{ paddingBottom: 40 }}
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