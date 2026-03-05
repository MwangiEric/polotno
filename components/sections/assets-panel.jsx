// components/sections/assets-panel.jsx

import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { 
  Button, InputGroup, Tabs, Tab, 
  Callout, Card, Spinner, Tag,
  Divider, Dialog, Classes,
  Checkbox, HTMLSelect,
  NonIdealState
} from '@blueprintjs/core';

// Configuration
const CORS_PROXY = 'https://cors.ericmwangi13.workers.dev/?url=';
const SEARXNG_URL = 'https://far-paule-emw-a67bd497.koyeb.app';
const WSRV_BASE = 'https://wsrv.nl/?url=';
const ICONIFY_API = 'https://api.iconify.design';
const GITHUB_REPO = 'MwangiEric/polotno';
const GITHUB_BRANCH = 'main';
const ASSETS_PATH = 'public/assets/img/icons';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/contents/${ASSETS_PATH}?ref=${GITHUB_BRANCH}`;
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${ASSETS_PATH}`;

// Fetch with timeout
const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const AssetsPanel = observer(({ store }) => {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [displayCount, setDisplayCount] = useState(12);
  const [message, setMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [githubAssets, setGithubAssets] = useState([]);
  const [iconsLoading, setIconsLoading] = useState(false);
  const [githubError, setGithubError] = useState(null);
  
  // Iconify search states
  const [iconResults, setIconResults] = useState([]);
  const [iconLoading, setIconLoading] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  
  // Filters
  const [minResolution, setMinResolution] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [requireTransparent, setRequireTransparent] = useState(true);
  
  // Download dialog
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const abortControllerRef = useRef(null);

  useEffect(() => {
    loadGithubAssets();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadGithubAssets = async () => {
    setIconsLoading(true);
    setGithubError(null);
    
    try {
      const response = await fetchWithTimeout(GITHUB_API_URL, {}, 15000);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Assets folder not found in repository');
        } else if (response.status === 403) {
          throw new Error('API rate limit exceeded. Please try again later.');
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format from GitHub');
      }
      
      const assets = data
        .filter(file => file.type === 'file' && (file.name.endsWith('.svg') || file.name.endsWith('.png') || file.name.endsWith('.jpg')))
        .map(file => ({
          name: file.name,
          url: file.download_url,
          type: file.name.endsWith('.svg') ? 'svg' : 'image',
          path: file.path,
          size: file.size
        }));
      
      setGithubAssets(assets);
      
      if (assets.length === 0) {
        setMessage('No image assets found in the icons folder');
      }
    } catch (err) {
      console.error('Error loading GitHub assets:', err);
      setGithubError(err.message);
      setMessage(`Failed to load assets: ${err.message}`);
      setGithubAssets([]);
    } finally {
      setIconsLoading(false);
    }
  };

  // Search icons using Iconify API (no key needed)
  const searchIcons = async (query) => {
    if (!query.trim()) {
      setIconResults([]);
      return;
    }
    
    setIconLoading(true);
    try {
      // Search Iconify - no API key needed!
      const searchUrl = `${ICONIFY_API}/search?query=${encodeURIComponent(query)}&limit=48`;
      const response = await fetchWithTimeout(searchUrl, {}, 10000);
      
      if (!response.ok) throw new Error('Icon search failed');
      
      const data = await response.json();
      
      // Transform results
      const icons = (data.icons || []).map(iconKey => {
        const [prefix, name] = iconKey.split(':');
        return {
          id: iconKey,
          name: name,
          prefix: prefix,
          set: data.collections?.[prefix]?.name || prefix,
          url: `${ICONIFY_API}/${prefix}/${name}.svg`
        };
      });
      
      setIconResults(icons);
    } catch (err) {
      console.error('Icon search error:', err);
      setMessage('Icon search failed: ' + err.message);
    } finally {
      setIconLoading(false);
    }
  };

  // Debounce icon search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'icons' && iconSearchQuery) {
        searchIcons(iconSearchQuery);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [iconSearchQuery, activeTab]);

  const parseResolution = (resString) => {
    if (!resString) return 0;
    const match = resString.match(/(\d+)\s*[×x]\s*(\d+)/);
    if (match) {
      return parseInt(match[1]) * parseInt(match[2]);
    }
    return 0;
  };

  const searchImages = async () => {
    if (!searchQuery.trim()) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setMessage('');
    setResults([]);
    setDisplayCount(12);
    
    try {
      const searxUrl = `${SEARXNG_URL}/search?q=${encodeURIComponent(searchQuery + (requireTransparent ? ' transparent' : ''))}&format=json&categories=images`;
      const proxyUrl = `${CORS_PROXY}${encodeURIComponent(searxUrl)}`;
      
      console.log('Fetching:', proxyUrl);
      
      const response = await fetchWithTimeout(proxyUrl, {
        signal: abortControllerRef.current.signal
      }, 20000);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
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

      if (minResolution) {
        const minPixels = parseInt(minResolution) * parseInt(minResolution);
        images = images.filter(img => img.totalPixels >= minPixels);
      }

      if (selectedFormat !== 'all') {
        images = images.filter(img => 
          img.format?.toLowerCase().includes(selectedFormat.toLowerCase())
        );
      }

      images.sort((a, b) => b.totalPixels - a.totalPixels);

      setResults(images);
      
      if (images.length === 0) {
        setMessage('No images found matching your criteria.');
      } else {
        setMessage(`Found ${images.length} images`);
      }
      
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Search aborted');
        return;
      }
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

  const getWsrvUrl = (originalUrl, options = {}) => {
    const { width = 400, height = 400, output = 'auto' } = options;
    return `${WSRV_BASE}${originalUrl}&w=${width}&h=${height}&fit=contain&output=${output}&n=-1`;
  };

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

  const downloadImage = async (imageData) => {
    try {
      setMessage('Preparing download...');
      const wsrvUrl = getWsrvUrl(imageData.fullImage, { width: 1200, height: 1200, output: 'png' });
      const response = await fetchWithTimeout(wsrvUrl, {}, 30000);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${imageData.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${generateId()}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setMessage('Downloaded successfully!');
      setDownloadDialogOpen(false);
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('Download failed: ' + err.message);
    }
  };

  const openDownloadDialog = (image) => {
    setSelectedImage(image);
    setDownloadDialogOpen(true);
  };

  const loadMore = () => {
    setDisplayCount(prev => prev + 12);
  };

  const addIconToCanvas = (icon) => {
    const { width, height } = store;
    store.activePage.addElement({
      type: 'svg',
      name: `icon-${icon.name}`,
      src: icon.url,
      x: width / 2 - 40,
      y: height / 2 - 40,
      width: 80,
      height: 80,
      fill: selectedColor
    });
    
    setMessage(`Added ${icon.name} icon`);
    setTimeout(() => setMessage(''), 1500);
  };

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

    const visibleResults = results.slice(0, displayCount);
    const hasMore = displayCount < results.length;

    return (
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxHeight: '500px',
        overflowY: 'auto',
        padding: 4
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 10
        }}>
          {visibleResults.map((img) => (
            <Card key={img.id} style={{ padding: 8, position: 'relative' }}>
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
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = getWsrvUrl(img.fullImage, { width: 400, height: 300 });
                  }}
                />
              </div>

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

              <div style={{ display: 'flex', gap: 4 }}>
                <Button small intent="primary" fill onClick={() => addToCanvas(img, false)}>
                  Add
                </Button>
                <Button small onClick={() => addToCanvas(img, true)}>
                  HD
                </Button>
                <Button small minimal icon="download" onClick={() => openDownloadDialog(img)} />
              </div>
            </Card>
          ))}
        </div>

        {hasMore && (
          <Button fill large intent="primary" onClick={loadMore}>
            Load More ({results.length - displayCount} remaining)
          </Button>
        )}
      </div>
    );
  };

  const renderFilters = () => (
    <div style={{ padding: 12, background: '#1a1a1b', borderRadius: 4, marginBottom: 12 }}>
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

  const renderIconGrid = () => {
    if (iconLoading) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spinner />
          <p style={{ color: '#888', marginTop: 12 }}>Searching icons...</p>
        </div>
      );
    }

    if (!iconSearchQuery) {
      return (
        <NonIdealState
          icon="search"
          title="Search Icons"
          description="Type to search 100,000+ icons from Iconify (Material Design, FontAwesome, Heroicons, etc.)"
        />
      );
    }

    if (iconResults.length === 0) {
      return (
        <NonIdealState
          icon="issue"
          title="No icons found"
          description={`No icons match "${iconSearchQuery}"`}
        />
      );
    }

    return (
      <div style={{ maxHeight: '450px', overflowY: 'auto', padding: 4 }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(6, 1fr)', 
          gap: 8,
          marginBottom: 16
        }}>
          {iconResults.map((icon) => (
            <div
              key={icon.id}
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
                transition: 'all 0.2s',
                position: 'relative'
              }}
              title={`${icon.name} (${icon.set})`}
            >
              <img 
                src={icon.url}
                alt={icon.name}
                style={{ 
                  width: '100%', 
                  height: '100%',
                  filter: selectedColor && selectedColor !== '#000000' ? `invert(1) drop-shadow(0 0 0 ${selectedColor})` : 'none'
                }}
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const parent = e.target.parentElement;
                  parent.innerHTML = `<span style="font-size: 8px; color: #666">${icon.name.slice(0, 3)}</span>`;
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', color: '#888', fontSize: 12 }}>
          Showing {iconResults.length} icons from Iconify
        </div>
      </div>
    );
  };

  const renderGithubAssets = () => {
    if (iconsLoading) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spinner />
          <p style={{ color: '#888', marginTop: 12 }}>Loading assets from GitHub...</p>
        </div>
      );
    }

    if (githubError) {
      return (
        <NonIdealState
          icon="error"
          title="Failed to load assets"
          description={githubError}
          action={
            <Button intent="primary" onClick={loadGithubAssets}>
              Retry
            </Button>
          }
        />
      );
    }

    if (githubAssets.length === 0) {
      return (
        <NonIdealState
          icon="folder-open"
          title="No assets found"
          description="Upload images to your GitHub repository at public/assets/img/icons/"
        />
      );
    }

    return (
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
            onClick={async () => {
              if (asset.type === 'svg') {
                try {
                  const response = await fetch(asset.url);
                  const svgText = await response.text();
                  const blob = new Blob([svgText], { type: 'image/svg+xml' });
                  const url = URL.createObjectURL(blob);
                  
                  store.activePage.addElement({
                    type: 'svg',
                    src: url,
                    x: store.width / 2 - 100,
                    y: store.height / 2 - 100,
                    width: 200,
                    height: 200,
                    name: asset.name
                  });
                } catch (err) {
                  store.activePage.addElement({
                    type: 'svg',
                    src: asset.url,
                    x: store.width / 2 - 100,
                    y: store.height / 2 - 100,
                    width: 200,
                    height: 200,
                    name: asset.name
                  });
                }
              } else {
                store.activePage.addElement({
                  type: 'image',
                  src: asset.url,
                  x: store.width / 2 - 100,
                  y: store.height / 2 - 100,
                  width: 200,
                  height: 200,
                  name: asset.name
                });
              }
              setMessage(`Added ${asset.name}`);
              setTimeout(() => setMessage(''), 1500);
            }}
            style={{ padding: 8 }}
          >
            <div style={{
              width: '100%',
              height: 100,
              background: asset.type === 'svg' ? '#f0f0f0' : '#2d2d2e',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <img 
                src={asset.url}
                alt={asset.name}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  padding: asset.type === 'svg' ? 12 : 0
                }}
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `<span style="color: #666; font-size: 10px;">Failed to load</span>`;
                }}
              />
            </div>
            <div style={{ fontSize: 11, marginTop: 8, textAlign: 'center', wordBreak: 'break-all' }}>
              {asset.name}
            </div>
            <Tag minimal style={{ marginTop: 4, display: 'block', textAlign: 'center' }}>
              {(asset.size / 1024).toFixed(1)} KB
            </Tag>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #333' }}>
        <h3 style={{ margin: '0 0 12px 0' }}>Assets & Images</h3>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            style={{ width: 40, height: 36, border: 'none', borderRadius: 4, cursor: 'pointer' }}
          />
          <InputGroup
            placeholder={activeTab === 'icons' ? "Search icons (e.g., phone, laptop, arrow)..." : "Search images..."}
            value={activeTab === 'icons' ? iconSearchQuery : searchQuery}
            onChange={(e) => {
              if (activeTab === 'icons') {
                setIconSearchQuery(e.target.value);
              } else {
                setSearchQuery(e.target.value);
              }
            }}
            onKeyPress={(e) => e.key === 'Enter' && activeTab === 'search' && searchImages()}
            rightElement={
              activeTab === 'search' && (
                <Button small intent="primary" onClick={searchImages} loading={loading}>
                  Search
                </Button>
              )
            }
            style={{ flex: 1 }}
          />
        </div>
      </div>

      <Tabs
        selectedTabId={activeTab}
        onChange={(newTab) => {
          setActiveTab(newTab);
          setMessage('');
        }}
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
              <Callout intent="primary" style={{ marginBottom: 12 }}>
                <strong>Free Search:</strong> 100,000+ icons from Material Design, FontAwesome, Heroicons, and more via Iconify
              </Callout>
              {renderIconGrid()}
            </div>
          } 
        />
        <Tab 
          id="assets" 
          title="My Assets" 
          panel={
            <div style={{ padding: 12 }}>
              <Callout intent="primary" style={{ marginBottom: 12 }}>
                From: <code>github.com/{GITHUB_REPO}/{ASSETS_PATH}</code>
              </Callout>
              {renderGithubAssets()}
            </div>
          } 
        />
      </Tabs>

      {message && (
        <Callout 
          intent={message.includes('failed') || message.includes('Failed') || message.includes('error') ? 'danger' : 'success'}
          style={{ margin: 12 }}
        >
          {message}
        </Callout>
      )}

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
