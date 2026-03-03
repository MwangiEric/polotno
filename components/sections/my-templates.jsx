// components/sections/my-templates.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { 
  Button, Card, InputGroup, FileInput, 
  Dialog, Classes, Callout, Tag, Icon,
  Divider, Spinner
} from '@blueprintjs/core';
import Image from 'next/image';

// GitHub repo configuration
const GITHUB_REPO = 'MwangiEric/polotno';
const GITHUB_BRANCH = 'main';
const TEMPLATES_PATH = 'public/templates';
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${TEMPLATES_PATH}`;
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/contents/${TEMPLATES_PATH}`;

// LocalStorage only for metadata/cache
const CACHE_KEY = 'polotno_templates_cache';

export const MyTemplatesPanel = observer(({ store }) => {
  const [templates, setTemplates] = useState([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [message, setMessage] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);

  // Load templates from GitHub on mount - FIXED: useCallback for dependency
  const loadTemplatesFromGitHub = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(GITHUB_API_URL);
      
      if (!response.ok) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          setTemplates(JSON.parse(cached));
          setMessage('Loaded from cache. GitHub API rate limited.');
        } else {
          await loadDefaultTemplates();
        }
        setLoading(false);
        return;
      }

      const files = await response.json();
      const jsonFiles = files.filter(f => f.name.endsWith('.json'));

      const templatesList = await Promise.all(
        jsonFiles.map(async (file) => {
          const templateData = await fetchTemplateFromGitHub(file.name);
          return {
            id: file.name.replace('.json', ''),
            name: templateData.name || file.name.replace('.json', '').replace(/-/g, ' '),
            filename: file.name,
            created: file.last_modified || new Date().toISOString(),
            width: templateData.width || 1080,
            height: templateData.height || 1920,
            elementCount: templateData.pages?.[0]?.children?.length || 0,
            thumbnail: templateData.thumbnail || null,
            source: 'github',
            sha: file.sha
          };
        })
      );

      setTemplates(templatesList);
      localStorage.setItem(CACHE_KEY, JSON.stringify(templatesList));
      
    } catch (err) {
      console.error('Failed to load from GitHub:', err);
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setTemplates(JSON.parse(cached));
        setMessage('Loaded from cache. Could not reach GitHub.');
      }
    }
    setLoading(false);
  }, []); // Empty dependency array since it doesn't depend on props/state

  useEffect(() => {
    loadTemplatesFromGitHub();
  }, [loadTemplatesFromGitHub]); // FIXED: Added dependency

  // Fetch individual template JSON from GitHub raw URL
  const fetchTemplateFromGitHub = async (filename) => {
    try {
      const response = await fetch(`${GITHUB_RAW_URL}/${filename}`);
      if (!response.ok) throw new Error('Failed to fetch template');
      return await response.json();
    } catch (err) {
      console.error(`Error fetching ${filename}:`, err);
      return {};
    }
  };

  // Load default templates if GitHub fails
  const loadDefaultTemplates = async () => {
    const defaultTemplates = [
      { id: 'danco-standard', name: 'Danco Standard', filename: 'danco-standard.json' }
    ];

    const loaded = await Promise.all(
      defaultTemplates.map(async (t) => {
        const data = await fetchTemplateFromGitHub(t.filename);
        return {
          ...t,
          width: data.width || 1080,
          height: data.height || 1920,
          elementCount: data.pages?.[0]?.children?.length || 0,
          created: new Date().toISOString()
        };
      })
    );

    setTemplates(loaded);
  };

  // Load template JSON into editor
  const loadTemplate = async (template) => {
    try {
      setLoading(true);
      const json = await fetchTemplateFromGitHub(template.filename);
      
      if (!json.pages) {
        throw new Error('Invalid template format');
      }

      store.loadJSON(json);
      setMessage(`Loaded "${template.name}"`);
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('Failed to load template: ' + err.message);
    }
    setLoading(false);
  };

  // Save current canvas as template
  const saveCurrentTemplate = async () => {
    if (!templateName.trim()) {
      setMessage('Please enter a template name');
      return;
    }

    if (!githubToken) {
      setIsTokenDialogOpen(true);
      return;
    }

    setLoading(true);
    try {
      const json = store.toJSON();
      const filename = `${templateName.trim().replace(/\s+/g, '-').toLowerCase()}.json`;

      const thumbnail = await store.toDataURL({ pixelRatio: 0.3 });

      const templateData = {
        name: templateName.trim(),
        width: store.width,
        height: store.height,
        thumbnail: thumbnail,
        pages: json.pages
      };

      const content = btoa(JSON.stringify(templateData, null, 2));
      
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${TEMPLATES_PATH}/${filename}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Add template: ${templateName}`,
          content: content,
          branch: GITHUB_BRANCH
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save to GitHub');
      }

      const result = await response.json();

      const newTemplate = {
        id: filename.replace('.json', ''),
        name: templateName.trim(),
        filename: filename,
        created: new Date().toISOString(),
        width: store.width,
        height: store.height,
        elementCount: json.pages?.[0]?.children?.length || 0,
        thumbnail: thumbnail,
        source: 'github',
        sha: result.content.sha
      };

      const updated = [newTemplate, ...templates];
      setTemplates(updated);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));

      setMessage(`Template "${templateName}" saved to GitHub!`);
      setTemplateName('');
      setIsSaveDialogOpen(false);
      setTimeout(() => setMessage(''), 3000);

    } catch (err) {
      setMessage('Error saving: ' + err.message);
    }
    setLoading(false);
  };

  // Upload JSON template file
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (!json.pages && !json.width) {
        throw new Error('Invalid Polotno template format');
      }

      const templateData = json.pages ? json : { pages: [json] };

      if (githubToken) {
        const filename = file.name;
        const content = btoa(JSON.stringify(templateData, null, 2));
        
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${TEMPLATES_PATH}/${filename}`, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Upload template: ${filename}`,
            content: content,
            branch: GITHUB_BRANCH
          })
        });

        if (!response.ok) {
          throw new Error('Failed to upload to GitHub');
        }

        const result = await response.json();
        
        const newTemplate = {
          id: filename.replace('.json', ''),
          name: file.name.replace(/\.json$/i, '').replace(/-/g, ' '),
          filename: filename,
          created: new Date().toISOString(),
          width: templateData.width || 1080,
          height: templateData.height || 1920,
          elementCount: templateData.pages?.[0]?.children?.length || 0,
          source: 'github',
          sha: result.content.sha
        };

        const updated = [newTemplate, ...templates];
        setTemplates(updated);
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        setMessage(`Uploaded "${file.name}" to GitHub!`);
      } else {
        store.loadJSON(templateData);
        setMessage(`Loaded "${file.name}" locally (no GitHub token)`);
      }

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error uploading: ' + err.message);
    }
    setLoading(false);
  };

  // Delete template from GitHub
  const deleteTemplate = async (template, event) => {
    event.stopPropagation();
    if (!confirm(`Delete "${template.name}" from GitHub?`)) return;

    if (!githubToken) {
      setIsTokenDialogOpen(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${TEMPLATES_PATH}/${template.filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Delete template: ${template.name}`,
          sha: template.sha,
          branch: GITHUB_BRANCH
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete from GitHub');
      }

      const updated = templates.filter(t => t.id !== template.id);
      setTemplates(updated);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      setMessage(`Deleted "${template.name}"`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error deleting: ' + err.message);
    }
    setLoading(false);
  };

  // Export template as JSON file
  const exportTemplate = async (template, event) => {
    event.stopPropagation();
    setLoading(true);
    
    try {
      const json = await fetchTemplateFromGitHub(template.filename);
      
      const exportData = {
        name: template.name,
        width: template.width,
        height: template.height,
        pages: json.pages
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = template.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage('Error exporting: ' + err.message);
    }
    setLoading(false);
  };

  // Show preview
  const showPreview = (template, event) => {
    event.stopPropagation();
    setPreviewTemplate(template);
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3>My Templates</h3>

      {/* GitHub Token Input */}
      <Callout intent="primary" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <InputGroup
            small
            placeholder="GitHub Token (only for save/upload/delete)"
            value={githubToken}
            onChange={e => setGithubToken(e.target.value)}
            type="password"
            style={{ flex: 1 }}
          />
          <Button 
            small 
            onClick={() => setIsTokenDialogOpen(true)}
            icon="key"
          >
            Help
          </Button>
        </div>
        {!githubToken && (
          <div style={{ fontSize: '11px', marginTop: 4, color: '#888' }}>
            Token only needed to save templates. Reading is free!
          </div>
        )}
      </Callout>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button 
          intent="primary" 
          icon="floppy-disk"
          onClick={() => setIsSaveDialogOpen(true)}
          disabled={!githubToken}
          fill
        >
          Save to GitHub
        </Button>

        <FileInput
          text="Upload JSON..."
          onInputChange={handleFileUpload}
          fill
          buttonText="Browse"
        />

        <Button
          minimal
          icon="refresh"
          onClick={loadTemplatesFromGitHub}
          loading={loading}
          title="Refresh from GitHub"
        />
      </div>

      {message && (
        <Callout 
          intent={message.includes('Error') || message.includes('Failed') ? 'danger' : 'success'} 
          style={{ marginBottom: 16 }}
        >
          {message}
        </Callout>
      )}

      <Divider style={{ marginBottom: 16 }} />

      {/* Template List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* FIXED: Changed from <p> to <div> to avoid DOM nesting warning */}
        <div style={{ color: '#888', marginBottom: 12, fontSize: '12px', display: 'flex', alignItems: 'center' }}>
          {templates.length} template{templates.length !== 1 ? 's' : ''} from GitHub
          {loading && <Spinner size={14} style={{ marginLeft: 8 }} />}
        </div>

        {templates.map(template => (
          <Card 
            key={template.id}
            interactive
            onClick={() => loadTemplate(template)}
            style={{ 
              marginBottom: 12, 
              position: 'relative',
              padding: 12,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Thumbnail - FIXED: Using Next.js Image component */}
              <div style={{ 
                width: 60, 
                height: 60, 
                background: '#333',
                borderRadius: 4,
                overflow: 'hidden',
                flexShrink: 0,
                position: 'relative'
              }}>
                {template.thumbnail ? (
                  <Image 
                    src={template.thumbnail} 
                    alt={template.name}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="60px"
                  />
                ) : (
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#666'
                  }}>
                    <Icon icon="layout-grid" size={24} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  marginBottom: 4,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {template.name}
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  {template.width}×{template.height} • {template.elementCount} elements
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: 4 }}>
                  {new Date(template.created).toLocaleDateString()}
                  <Tag intent="primary" minimal style={{ marginLeft: 8 }}>GitHub</Tag>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Button 
                  small 
                  minimal 
                  icon="eye-open"
                  onClick={(e) => showPreview(template, e)}
                  title="Preview"
                />
                <Button 
                  small 
                  minimal 
                  icon="download"
                  onClick={(e) => exportTemplate(template, e)}
                  title="Export JSON"
                />
                {githubToken && (
                  <Button 
                    small 
                    minimal 
                    icon="trash"
                    intent="danger"
                    onClick={(e) => deleteTemplate(template, e)}
                    title="Delete from GitHub"
                  />
                )}
              </div>
            </div>
          </Card>
        ))}

        {templates.length === 0 && !loading && (
          <Callout intent="primary">
            No templates found in GitHub repo. Add a GitHub token to save templates.
          </Callout>
        )}
      </div>

      {/* Save Dialog */}
      <Dialog 
        isOpen={isSaveDialogOpen} 
        onClose={() => setIsSaveDialogOpen(false)}
        title="Save Template to GitHub"
      >
        <div className={Classes.DIALOG_BODY}>
          {!githubToken && (
            <Callout intent="warning" style={{ marginBottom: 12 }}>
              GitHub token required to save. Click Help for instructions.
            </Callout>
          )}
          <p>Save your current design to the GitHub repository.</p>
          <InputGroup
            large
            placeholder="Template name (e.g. Luxury Phone Poster)"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            autoFocus
          />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
            <Button 
              intent="primary" 
              onClick={saveCurrentTemplate}
              disabled={!githubToken || !templateName.trim()}
              loading={loading}
            >
              Save to GitHub
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Token Help Dialog - FIXED: Escaped quotes */}
      <Dialog
        isOpen={isTokenDialogOpen}
        onClose={() => setIsTokenDialogOpen(false)}
        title="GitHub Token (Optional)"
      >
        <div className={Classes.DIALOG_BODY}>
          <Callout intent="success" style={{ marginBottom: 12 }}>
            <strong>Good news!</strong> Since this is a public repo, you can read/download 
            templates without any token. The token is only needed if you want to 
            save new templates directly from this app.
          </Callout>
          
          <h4>To get a token (optional):</h4>
          <ol style={{ paddingLeft: 20, lineHeight: 1.6 }}>
            <li>Go to github.com/settings/tokens</li>
            <li>Click Generate new token (classic)</li>
            <li>Select repo scope</li>
            <li>Copy the token and paste it here</li>
          </ol>
          
          <InputGroup
            large
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={githubToken}
            onChange={e => setGithubToken(e.target.value)}
            type="password"
            style={{ marginTop: 12 }}
          />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={() => setIsTokenDialogOpen(false)}>Close</Button>
            <Button 
              intent="primary" 
              onClick={() => {
                setIsTokenDialogOpen(false);
                if (githubToken) {
                  setMessage('GitHub token set!');
                }
              }}
            >
              Save Token
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Preview Dialog - FIXED: Escaped quotes */}
      <Dialog
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        title={previewTemplate?.name || 'Template Preview'}
        style={{ width: 'auto', maxWidth: '90vw', maxHeight: '90vh' }}
      >
        <div className={Classes.DIALOG_BODY} style={{ padding: 0 }}>
          {previewTemplate?.thumbnail ? (
            <div style={{ position: 'relative', width: '100%', height: '60vh' }}>
              <Image 
                src={previewTemplate.thumbnail} 
                alt="Template preview"
                fill
                style={{ objectFit: 'contain' }}
                sizes="90vw"
              />
            </div>
          ) : (
            <Callout intent="warning" style={{ margin: 20 }}>
              No preview available. Load template to see preview.
            </Callout>
          )}

          <div style={{ padding: 16 }}>
            <strong>Dimensions:</strong> {previewTemplate?.width}×{previewTemplate?.height}<br/>
            <strong>Elements:</strong> {previewTemplate?.elementCount}<br/>
            <strong>File:</strong> {previewTemplate?.filename}<br/>
            <strong>Created:</strong> {previewTemplate?.created && new Date(previewTemplate.created).toLocaleString()}
          </div>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={() => setPreviewTemplate(null)}>Close</Button>
            <Button 
              intent="primary" 
              onClick={() => {
                loadTemplate(previewTemplate);
                setPreviewTemplate(null);
              }}
            >
              Load This Template
            </Button>
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
        <path d="M12 7v10" />
        <path d="M7 12h10" />
      </svg>
    </SectionTab>
  ),
  Panel: MyTemplatesPanel,
};
