// components/sections/pexels.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, Button, Spinner, Callout, HTMLSelect } from '@blueprintjs/core';
import { ImagesGrid } from 'polotno/side-panel/images-grid';

const PEXELS_API_KEY = '02Ujj3rt5UpJ4QCJ1Q2FN5soZR3ygTn5fp1BnqMp9pzLtxFAXoNpOR2m';

const CATEGORIES = [
  { value: 'nature', label: 'Nature' },
  { value: 'people', label: 'People' },
  { value: 'technology', label: 'Technology' },
  { value: 'business', label: 'Business' },
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food' },
  { value: 'interior', label: 'Interior' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'abstract', label: 'Abstract' },
  { value: 'animals', label: 'Animals' }
];

export const PexelsPanel = observer(({ store }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchPexels = useCallback(async (searchQuery = '', pageNum = 1) => {
    setLoading(true);
    setError(null);

    try {
      let url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery || category)}&per_page=30&page=${pageNum}`;
      
      const res = await fetch(url, {
        headers: {
          Authorization: PEXELS_API_KEY
        }
      });

      if (!res.ok) {
        throw new Error(`Pexels API error: ${res.status}`);
      }

      const data = await res.json();

      if (data.photos && Array.isArray(data.photos)) {
        const formatted = data.photos.map(photo => ({
          thumbnail: photo.src.tiny || photo.src.small,
          full: photo.src.large2x || photo.src.original,
          alt: photo.alt || 'Pexels photo',
          photographer: photo.photographer,
          photographer_url: photo.photographer_url
        }));
        setImages(formatted);
      } else {
        setError('No photos returned from Pexels');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load Pexels images');
    } finally {
      setLoading(false);
    }
  }, [category]);

  // Initial load + category change
  useEffect(() => {
    fetchPexels('', 1);
  }, [fetchPexels]);

  // Search on query change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        fetchPexels(query.trim(), 1);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [query, fetchPexels]);

  const loadMore = () => {
    setPage(prev => prev + 1);
    fetchPexels(query.trim() || category, page + 1);
  };

  const addToCanvas = (item) => {
    const fullSrc = item.full;

    const canvasWidth = store.width;
    const canvasHeight = store.height;
    const maxSize = Math.min(canvasWidth * 0.85, canvasHeight * 0.85);
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
      name: 'pexels-photo',
      shadowBlur: 10,
      shadowColor: 'rgba(0,0,0,0.3)',
      shadowOffsetX: 4,
      shadowOffsetY: 4
    });
  };

  const setAsBackground = () => {
    if (images.length === 0) return;
    const first = images[0].full;

    store.activePage.set({
      backgroundImage: first,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 12 }}>
      <h3>Pexels Free Photos</h3>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <HTMLSelect
          value={category}
          onChange={e => {
            setCategory(e.target.value);
            setQuery('');
            setPage(1);
          }}
          style={{ minWidth: 140 }}
        >
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </HTMLSelect>

        <InputGroup
          large
          leftIcon="search"
          placeholder="Search Pexels..."
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setPage(1);
          }}
          style={{ flex: 1 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
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
          <div style={{ marginTop: 10 }}>Loading from Pexels...</div>
        </div>
      )}

      {error && (
        <Callout intent="danger" style={{ marginBottom: 16 }}>
          {error}
        </Callout>
      )}

      {!loading && !error && images.length === 0 && (query || category) && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
          No photos found
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ImagesGrid
          key={`${category}-${query}-${page}`}
          images={images}
          getPreview={img => img.thumbnail}
          rowsNumber={3}
          isLoading={loading}
          onSelect={addToCanvas}
        />

        {images.length > 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Button
              intent="primary"
              onClick={loadMore}
              loading={loading}
              disabled={loading}
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

export const PexelsSection = {
  name: 'pexels',
  Tab: (props) => (
    <SectionTab name="Pexels Photos" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </SectionTab>
  ),
  Panel: PexelsPanel,
};
