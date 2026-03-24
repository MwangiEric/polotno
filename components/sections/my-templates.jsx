// components/sections/my-templates.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { 
  Button, Card, InputGroup, FileInput, 
  Dialog, Classes, Callout, Tag, Icon,
  Divider, Spinner, Tooltip, Collapse,
  Tab, Tabs, Checkbox
} from '@blueprintjs/core';
import Image from 'next/image';

// Configuration
const TEMPLATES_PATH = '/templates';
const MANIFEST_URL = '/templates/manifest.json';
const CACHE_KEY = 'polotno_templates_cache';
const CACHE_TIMESTAMP_KEY = 'polotno_templates_cache_time';
const FAVORITES_KEY = 'polotno_favorites';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const MyTemplatesPanel = observer(({ store }) => {
  const [templates, setTemplates] = useState([]);
  const [templatesWithErrors, setTemplatesWithErrors] = useState([]);
  const [categorized, setCategorized] = useState({ all: [], polotno: [], dated: [], others: [] });
  const [activeTab, setActiveTab] = useState('all');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [message, setMessage] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showErrors, setShowErrors] = useState(true);
  const [debugInfo, setDebugInfo] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    }
    return [];
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const toggleFavorite = useCallback((id, event) => {
    event.stopPropagation();
    const newFavs = favorites.includes(id) 
      ? favorites.filter(f => f !== id)
      : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
  }, [favorites]);

  const isFavorite = useCallback((id) => favorites.includes(id), [favorites]);

  const discoverTemplates = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setIsRefreshing(forceRefresh);
    
    try {
      if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        const cacheTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        
        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < CACHE_DURATION_MS) {
            const parsed = JSON.parse(cached);
            setTemplates(parsed.valid || []);
            setTemplatesWithErrors(parsed.errors || []);
            setCategorized(parsed.categorized || { all: [], polotno: [], dated: [], others: [] });
            setLoading(false);
            setIsRefreshing(false);
            return;
          }
        }
      }

      let fileList = [];
      let discoveryMethod = '';

      try {
        const manifestRes = await fetch(MANIFEST_URL);
        if (manifestRes.ok) {
          const manifest = await manifestRes.json();
          fileList = manifest.templates || [];
          discoveryMethod = 'manifest';
        }
      } catch (e) {
        console.log('Manifest not found');
      }

      if (fileList.length === 0) {
        try {
          const apiRes = await fetch('/api/templates/list');
          if (apiRes.ok) {
            const data = await apiRes.json();
            fileList = data.files || [];
            discoveryMethod = 'api';
            setDebugInfo(data.debug || null);
          }
        } catch (e) {
          console.log('API not available');
        }
      }

      if (fileList.length === 0) {
        const commonNames = ['polotno.json'];
        for (let i = 1; i <= 20; i++) commonNames.push(`polotno (${i}).json`);
        
        const existingFiles = await Promise.all(
          commonNames.map(async (name) => {
            try {
              const res = await fetch(`${TEMPLATES_PATH}/${name}`, { method: 'HEAD' });
              return res.ok ? name : null;
            } catch { return null; }
          })
        );
        fileList = existingFiles.filter(Boolean);
        discoveryMethod = 'fallback-scan';
      }

      const loadedTemplates = [];
      const errorTemplates = [];

      await Promise.all(
        fileList.map(async (filename) => {
          const result = await fetchTemplateFromLocal(filename);
          
          const baseInfo = {
            id: filename.replace('.json', ''),
            filename: filename,
            category: getCategory(filename),
            created: new Date().toISOString()
          };

          if (result.error) {
            errorTemplates.push({
              ...baseInfo,
              name: filename,
              displayName: filename,
              hasError: true,
              errorMessage: result.error
            });
          } else {
            loadedTemplates.push({
              ...baseInfo,
              name: result.data.name || formatFilename(filename),
              width: result.data.width || 1080,
              height: result.data.height || 1920,
              // Fallback to 0 if children doesn't exist (empty page)
              elementCount: result.data.pages?.[0]?.children?.length || 0,
              thumbnail: result.data.thumbnail || null,
              hasError: false
            });
          }
        })
      );

      loadedTemplates.sort((a, b) => a.name.localeCompare(b.name));
      
      const newCategorized = {
        all: [...loadedTemplates, ...errorTemplates],
        polotno: loadedTemplates.filter(t => t.category === 'polotno'),
        tk: loadedTemplates.filter(t => t.category === 'tk'),
        dated: loadedTemplates.filter(t => t.category === 'dated'),
        others: loadedTemplates.filter(t => t.category === 'others' || !t.category)
      };

      setTemplates(loadedTemplates);
      setTemplatesWithErrors(errorTemplates);
      setCategorized(newCategorized);

      localStorage.setItem(CACHE_KEY, JSON.stringify({
        valid: loadedTemplates,
        errors: errorTemplates,
        categorized: newCategorized,
        discoveryMethod,
        timestamp: Date.now()
      }));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      
    } catch (err) {
      setMessage('Error discovering templates: ' + err.message);
    }
    setLoading(false);
    setIsRefreshing(false);
  }, []);

  const formatFilename = (filename) => filename.replace('.json', '').replace(/-|_/g, ' ');

  const getCategory = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.startsWith('polotno')) return 'polotno';
    if (lower.startsWith('tk_')) return 'tk';
    if (filename.match(/^\d{4}-\d{2}-\d{2}-/)) return 'dated';
    return 'others';
  };

  const fetchTemplateFromLocal = async (filename) => {
    try {
      const response = await fetch(`${TEMPLATES_PATH}/${filename}`);
      if (!response.ok) return { error: `HTTP ${response.status}` };

      const text = await response.text();
      let json;
      try { json = JSON.parse(text); } catch (e) { return { error: 'Invalid JSON format' }; }

      // Updated validation: Allow pages to exist even if empty
      if (!json.pages || !Array.isArray(json.pages) || json.pages.length === 0) {
        return { error: 'Template must have at least one page' };
      }

      return { data: json, error: null };
    } catch (err) {
      return { error: `Fetch error: ${err.message}` };
    }
  };

  useEffect(() => {
    discoverTemplates();
  }, [discoverTemplates]);

  const loadTemplate = async (template) => {
    if (template.hasError) return;
    setLoading(true);
    try {
      const result = await fetchTemplateFromLocal(template.filename);
      if (result.error) throw new Error(result.error);
      store.loadJSON(result.data);
      setMessage(`Loaded "${template.name}"`);
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('Load failed: ' + err.message);
    }
    setLoading(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        // Allow empty pages here as well
        if (!json.pages || !Array.isArray(json.pages) || json.pages.length === 0) {
          throw new Error('Invalid template structure');
        }
        store.loadJSON(json);
        setMessage(`Uploaded "${file.name}"`);
      } catch (err) {
        setMessage('Upload error: ' + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const saveCurrentTemplate = async () => {
    if (!templateName.trim()) return;
    setLoading(true);
    try {
      const json = store.toJSON();
      const thumbnail = await store.toDataURL({ pixelRatio: 0.2 });
      const templateData = {
        name: templateName.trim(),
        width: store.width,
        height: store.height,
        thumbnail: thumbnail,
        created: new Date().toISOString(),
        pages: json.pages
      };

      const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateName.toLowerCase().replace(/\s+/g, '-')}.json`;
      a.click();
      setIsSaveDialogOpen(false);
      setTemplateName('');
    } catch (err) {
      setMessage('Save failed: ' + err.message);
    }
    setLoading(false);
  };

  const currentTemplates = (categorized[activeTab] || templates).filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFav = showFavoritesOnly ? favorites.includes(t.id) : true;
    return matchesSearch && matchesFav;
  });

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>My Templates</h3>
        <Button small minimal icon="refresh" onClick={() => discoverTemplates(true)} loading={isRefreshing} />
      </div>

      <InputGroup
        placeholder="Search..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        leftIcon="search"
        style={{ marginBottom: 12 }}
      />

      <Checkbox
        checked={showFavoritesOnly}
        onChange={e => setShowFavoritesOnly(e.target.checked)}
        label={`Favorites only (${favorites.length})`}
        style={{ marginBottom: 12 }}
      />

      <Tabs selectedTabId={activeTab} onChange={setActiveTab} style={{ marginBottom: 12 }}>
        <Tab id="all" title="All" />
        <Tab id="polotno" title="Polotno" />
        <Tab id="tk" title="TK" />
        <Tab id="dated" title="Dated" />
      </Tabs>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button intent="primary" icon="plus" onClick={() => setIsSaveDialogOpen(true)} fill>Save New</Button>
        <FileInput text="Import" onInputChange={handleFileUpload} buttonText="Browse" />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {currentTemplates.map(template => (
          <Card 
            key={template.id} 
            interactive 
            onClick={() => loadTemplate(template)}
            style={{ marginBottom: 8, padding: 10, borderLeft: '3px solid #0f9960' }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, background: '#eee', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                {template.thumbnail ? (
                  <Image src={template.thumbnail} alt="" fill style={{ objectFit: 'cover' }} />
                ) : <Icon icon="document" size={20} style={{ margin: 14 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{template.name}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{template.elementCount} elements</div>
              </div>
              <Button 
                minimal 
                icon={favorites.includes(template.id) ? "star" : "star-empty"} 
                intent={favorites.includes(template.id) ? "warning" : "none"}
                onClick={(e) => toggleFavorite(template.id, e)}
              />
            </div>
          </Card>
        ))}
      </div>

      <Dialog isOpen={isSaveDialogOpen} onClose={() => setIsSaveDialogOpen(false)} title="Save Current Design">
        <div className={Classes.DIALOG_BODY}>
          <InputGroup large placeholder="Template name..." value={templateName} onChange={e => setTemplateName(e.target.value)} />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
            <Button intent="primary" onClick={saveCurrentTemplate} disabled={!templateName.trim()}>Download JSON</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
});

export const MyTemplatesSection = {
  name: 'my-templates',
  Tab: (props) => (
    <SectionTab name="My Templates" {...props}>
      <Icon icon="projects" size={18} />
    </SectionTab>
  ),
  Panel: MyTemplatesPanel,
};
