// components/sections/assets-panel.jsx

import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { 
  Button, InputGroup, Tabs, Tab, 
  Callout, Card, Spinner, Tag,
  Divider, Dialog, Classes,
  Checkbox, HTMLSelect
} from '@blueprintjs/core';

// Configuration
const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const SEARXNG_URL = 'https://far-paule-emw-a67bd497.koyeb.app';
const WSRV_BASE = 'https://wsrv.nl/?url=';
const GITHUB_REPO = 'MwangiEric/polotno';
const GITHUB_BRANCH = 'tree/main';
const ASSETS_PATH = 'public/assets/img/icons';
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${ASSETS_PATH}`;

// Iconoir popular icons
const ICONOIR_ICONS = [
  'home', 'user', 'settings', 'search', 'menu', 'close', 'check', 
  'arrow-left', 'arrow-right', 'plus', 'minus', 'trash', 'edit',
  'download', 'upload', 'image', 'camera', 'phone', 'mail', 'heart', 'star',
  'calendar', 'clock', 'map', 'tag', 'bookmark', 'bell', 'shield',
  'smartphone', 'tablet', 'laptop', 'display', 'headphones', 'speaker',
  'mic', 'video', 'music', 'play', 'pause', 'volume', 'wifi', 'bluetooth',
  'battery', 'cpu', 'database', 'server', 'cloud', 'lock', 'unlock',
  'eye', 'eye-close', 'filter', 'sort', 'grid', 'list', 'layers',
  'copy', 'paste', 'cut', 'undo', 'redo', 'refresh', 'link', 'share',
  'send', 'inbox', 'folder', 'file', 'code', 'terminal', 'git', 'github',
  'twitter', 'facebook', 'instagram', 'linkedin', 'youtube', 'whatsapp',
  'spotify', 'amazon', 'cart', 'bag', 'shop', 'globe', 'palette'
];

export const AssetsPanel = observer(({ store }) => {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [githubAssets, setGithubAssets] = useState([]);
  
  // Filters
  const [minResolution, setMinResolution] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('all'); // all, png, jpg, svg
  const [requireTransparent, setRequireTransparent] = useState(true);
  
  // Download dialog
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    loadGithubAssets();
  }, []);

  const loadGithubAssets = async () => {
    try {
      const response = await fetch(GITHUB_RAW_URL);
      if (!response.ok) return;
      
      const files = await response.json();
      const assets = files
        .filter(f => f.name.match(/\.(png|jpg|jpeg|svg|webp)$/i))
        .map(f => ({
          name: f.name,
          url: `${GITHUB_RAW_URL}/${f.name}`,
          type: f.name.match(/\.svg$/i) ? 'svg' : 'image'
        }));
      
      setGithubAssets(assets);
    } catch (err) {
      console.error('Failed to load GitHub assets:', err);
    }
  };

  // Parse resolution string "1100×490" to pixels
  const parseResolution = (resString) => {
    if (!resString) return 0;
    const match = resString.match(/(\d+)\s*[×x]\s*(\d+)/);
    if (match) {
      return parseInt(match[1]) * parseInt(match[2]); // Total pixels
    }
    return 0;
  };

  // Search with SearXNG through CORS proxy
  const searchImages = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setMessage('');
    setResults([]);
    
    try {
      // Build SearXNG URL
      const searxUrl = `${SEARXNG_URL}/search?q=${encodeURIComponent(searchQuery + (requireTransparent ? ' transparent' : ''))}&format=json&categories=images`;
      
      // Route through CORS proxy
      const proxyUrl = `${CORS_PROXY}${encodeURIComponent(searxUrl)}`;
      
      console.log('Fetching:', proxyUrl);
      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      // Process and filter results
      let images = (data.results || [])
        .filter(r => r.thumbnail_src || r.img_src)
        .map(r => ({
          id: generateId(),
          title: r.title || 'Image',
          source: r.source || r.parsed_url?.[1] || 'unknown',
          thumbnail: r.thumbnail_src,
          fullImage: r.img_src,
          resolution: r.resolution,
          format: r.img_format || detectFormat(r.img_src),
          url: r.url,
          engine: r.engine,
          totalPixels: parseResolution(r.resolution)
        }));

      // Apply filters
      if (minResolution) {
        const minPixels = parseInt(minResolution) * parseInt(minResolution);
        images = images.filter(img => img.totalPixels >= minPixels);
      }

      if (selectedFormat !== 'all') {
        images = images.filter(img => 
          img.format?.toLowerCase().includes(selectedFormat.toLowerCase())
        );
      }

      // Sort by resolution (highest first)
      images.sort((a, b) => b.totalPixels - a.totalPixels);

      setResults(images);
      
      if (images.length === 0) {
        setMessage('No images found matching your criteria.');
      } else {
        setMessage(`Found ${images.length} images`);
      }
      
    } catch (err) {
      console.error('Search error:', err);
      setMessage('Search failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const detectFormat = (url) => {
    if (!url) return 'unknown';
    if (url.match(/\.png/i)) return 'png';
    if (url.match(/\.jpe?g/i)) return 'jpg';
    if (url.match(/\.svg/i)) return 'svg';
    if (url.match(/\.webp/i)) return 'webp';
    return 'unknown';
  };

  // Get WSRV optimized URL
  const getWsrvUrl = (originalUrl, options = {}) => {
    const { width = 800, height = 800, output = 'png' } = options;
    const encoded = encodeURIComponent(originalUrl);
    return `${WSRV_BASE}${encoded}&w=${width}&h=${height}&fit=contain&output=${output}&n=-1`;
  };

  // Add image to canvas
  const addToCanvas = (imageData, useFullRes = false) => {
    const src = useFullRes ? imageData.fullImage : getWsrvUrl(imageData.fullImage);
    const { width, height } = store;
    
    store.activePage.addElement({
      type: 'image',
      src: src,
      x: width / 2 - 200,
      y: height / 2 - 200,
      width: 400,
      height: 400,
      keepRatio: true,
      name: `product-${generateId()}`
    });
    
    setMessage(`Added ${imageData.title.substring(0, 30)}...`);
    setTimeout(() => setMessage(''), 2000);
  };

  // Download image for later use
  const downloadImage = async (imageData) => {
    try {
      setMessage('Downloading...');
      
      // Use WSRV to get optimized image
      const wsrvUrl = getWsrvUrl(imageData.fullImage, { width: 1200, height: 1200, output: 'png' });
      
      const response = await fetch(`${CORS_PROXY}${encodeURIComponent(wsrvUrl)}`);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${imageData.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${generateId()}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setMessage('Downloaded!');
      setDownloadDialogOpen(false);
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('Download failed: ' + err.message);
    }
  };

  // Open download dialog
  const openDownloadDialog = (image) => {
    setSelectedImage(image);
    setDownloadDialogOpen(true);
  };

  // Render search results with thumbnails
  const renderSearchResults = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spinner />
          <p style={{ color: '#888', marginTop: 12 }}>Searching...</p>
        </div>
      );
    }

    if (results.length === 0) {
      return (
        <Callout intent="primary" style={{ margin: 20 }}>
          Search for product images with filters.
          <br /><br />
          <strong>Tip:</strong> Enable "Transparent" for PNGs with no background.
        </Callout>
      );
    }

    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: 10,
        maxHeight: '500px',
        overflowY: 'auto',
        padding: 4
      }}>
        {results.map((img) => (
          <Card
            key={img.id}
            style={{ padding: 8, position: 'relative' }}
          >
            {/* Thumbnail */}
            <div 
              style={{ 
                width: '100%', 
                height: 120, 
                background: '#2d2d2e',
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 8,
                cursor: 'pointer'
              }}
              onClick={() => addToCanvas(img, false)}
            >
              <img 
                src={img.thumbnail} 
                alt={img.title}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover'
                }}
                loading="lazy"
              />
            </div>

            {/* Info */}
            <div style={{ fontSize: 11, marginBottom: 6 }}>
              <div style={{ 
                fontWeight: 'bold', 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {img.title}
              </div>
              <div style={{ color: '#888', marginTop: 2 }}>
                {img.resolution && <Tag minimal intent="primary" style={{ marginRight: 4 }}>{img.resolution}</Tag>}
                {img.format && <Tag minimal>{img.format.toUpperCase()}</Tag>}
              </div>
              <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>
                {img.source}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 4 }}>
              <Button
                small
                intent="primary"
                fill
                onClick={() => addToCanvas(img, false)}
              >
                Add Low Res
              </Button>
              <Button
                small
                onClick={() => addToCanvas(img, true)}
              >
                Full Res
              </Button>
              <Button
                small
                minimal
                icon="download"
                onClick={() => openDownloadDialog(img)}
                title="Download for later"
              />
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // Render filters
  const renderFilters = () => (
    <div style={{ 
      padding: 12, 
      background: '#1a1a1b', 
      borderRadius: 4, 
      marginBottom: 12 
    }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Checkbox
          checked={requireTransparent}
          onChange={e => setRequireTransparent(e.target.checked)}
          label="Transparent PNG"
        />
        
        <HTMLSelect
          value={selectedFormat}
          onChange={e => setSelectedFormat(e.target.value)}
          options={[
            { value: 'all', label: 'All Formats' },
            { value: 'png', label: 'PNG' },
            { value: 'jpg', label: 'JPG' },
            { value: 'svg', label: 'SVG' }
          ]}
        />
        
        <InputGroup
          small
          placeholder="Min width (px)"
          value={minResolution}
          onChange={e => setMinResolution(e.target.value)}
          style={{ width: 100 }}
        />
      </div>
    </div>
  );

  // Render icon grid
  const renderIconGrid = () => {
    const icons = searchQuery 
      ? ICONOIR_ICONS.filter(i => i.includes(searchQuery.toLowerCase()))
      : ICONOIR_ICONS.slice(0, 48);

    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(6, 1fr)', 
        gap: 8,
        maxHeight: '400px',
        overflowY: 'auto',
        padding: 4
      }}>
        {icons.map(icon => (
          <div
            key={icon}
            onClick={() => addIconToCanvas(icon)}
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#2d2d2e',
              borderRadius: 6,
              cursor: 'pointer',
              padding: 8,
              border: '1px solid #444',
              transition: 'all 0.2s'
            }}
            title={icon}
          >
            <img 
              src={`https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/icons/regular/${icon}.svg`}
              alt={icon}
              style={{ 
                width: '100%', 
                height: '100%',
                filter: `drop-shadow(0 0 0 ${selectedColor})`
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  const addIconToCanvas = (iconName) => {
    const { width, height } = store;
    store.activePage.addElement({
      type: 'svg',
      name: `icon-${iconName}`,
      src: `https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/icons/regular/${iconName}.svg`,
      x: width / 2 - 40,
      y: height / 2 - 40,
      width: 80,
      height: 80,
      fill: selectedColor
    });
  };

  // Render GitHub assets
  const renderGithubAssets = () => (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(2, 1fr)', 
      gap: 10,
      maxHeight: '400px',
      overflowY: 'auto',
      padding: 4
    }}>
      {githubAssets.map((asset, idx) => (
        <Card
          key={idx}
          interactive
          onClick={() => {
            store.activePage.addElement({
              type: asset.type === 'svg' ? 'svg' : 'image',
              src: asset.url,
              x: store.width / 2 - 100,
              y: store.height / 2 - 100,
              width: 200,
              height: 200
            });
          }}
          style={{ padding: 8 }}
        >
          <img 
            src={asset.url} 
            alt={asset.name}
            style={{ 
              width: '100%', 
              height: 100, 
              objectFit: 'contain',
              background: asset.type === 'svg' ? '#f0f0f0' : 'transparent'
            }}
          />
          <div style={{ fontSize: 11, marginTop: 8, textAlign: 'center' }}>
            {asset.name}
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: 16, borderBottom: '1px solid #333' }}>
        <h3 style={{ margin: '0 0 12px 0' }}>Assets & Images</h3>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            style={{ width: 40, height: 36, border: 'none', borderRadius: 4 }}
          />
          <InputGroup
            placeholder="Search images, icons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && activeTab === 'search' && searchImages()}
            rightElement={
              activeTab === 'search' && (
                <Button 
                  small 
                  intent="primary" 
                  onClick={searchImages}
                  loading={loading}
                >
                  Search
                </Button>
              )
            }
            style={{ flex: 1 }}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        selectedTabId={activeTab}
        onChange={setActiveTab}
        style={{ flex: 1, overflow: 'hidden' }}
      >
        <Tab 
          id="search" 
          title="Search Images" 
          panel={
            <div style={{ padding: 12, height: '100%', overflow: 'auto' }}>
              {renderFilters()}
              {renderSearchResults()}
            </div>
          } 
        />
        <Tab 
          id="icons" 
          title="Icons" 
          panel={
            <div style={{ padding: 12 }}>
              {renderIconGrid()}
            </div>
          } 
        />
        <Tab 
          id="assets" 
          title="My Assets" 
          panel={
            <div style={{ padding: 12 }}>
              {renderGithubAssets()}
            </div>
          } 
        />
      </Tabs>

      {/* Message */}
      {message && (
        <Callout 
          intent={message.includes('failed') ? 'danger' : 'success'}
          style={{ margin: 12 }}
        >
          {message}
        </Callout>
      )}

      {/* Download Dialog */}
      <Dialog
        isOpen={downloadDialogOpen}
        onClose={() => setDownloadDialogOpen(false)}
        title="Download Image"
      >
        <div className={Classes.DIALOG_BODY}>
          {selectedImage && (
            <div>
              <img 
                src={selectedImage.thumbnail} 
                alt={selectedImage.title}
                style={{ width: '100%', maxHeight: 200, objectFit: 'contain', marginBottom: 12 }}
              />
              <p><strong>{selectedImage.title}</strong></p>
              <p>Resolution: {selectedImage.resolution || 'Unknown'}</p>
              <p>Source: {selectedImage.source}</p>
              <p style={{ color: '#888', fontSize: 12 }}>
                This will download the full resolution image through WSRV optimization.
              </p>
            </div>
          )}
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={() => setDownloadDialogOpen(false)}>Cancel</Button>
            <Button intent="primary" onClick={() => downloadImage(selectedImage)}>
              Download PNG
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
});

const generateId = () => Math.random().toString(36).substr(2, 9);

export const AssetsSection = {
  name: 'assets',
  Tab: (props) => (
    <SectionTab name="Assets" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    </SectionTab>
  ),
  Panel: AssetsPanel,
};