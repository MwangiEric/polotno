import React, { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { 
  Button, Card, InputGroup, FileInput, 
  Dialog, Classes, Callout, Tag, Icon,
  HTMLSelect, Divider
} from '@blueprintjs/core';
import { ImagesGrid } from 'polotno/side-panel/images-grid';
import FaSave from '@meronex/icons/fa/FaSave';

const STORAGE_KEY = 'polotno_my_templates';

export const MyTemplatesPanel = observer(({ store }) => {
  const [templates, setTemplates] = useState([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Load templates from localStorage on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTemplates(JSON.parse(saved));
      } else {
        // Load default from public folder
        loadDefaultTemplate();
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const loadDefaultTemplate = async () => {
    try {
      const response = await fetch('/templates/danco-standard.json');
      if (response.ok) {
        const defaultTemplate = await response.json();
        defaultTemplate.id = 'default-danco';
        defaultTemplate.isDefault = true;
        defaultTemplate.created = new Date().toISOString();
        setTemplates([defaultTemplate]);
        saveToStorage([defaultTemplate]);
      }
    } catch (err) {
      console.log('No default template found');
    }
  };

  const saveToStorage = (templateList) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templateList));
  };

  // Save current design as template
  const saveCurrentTemplate = () => {
    if (!templateName.trim()) {
      setMessage('Please enter a template name');
      return;
    }

    const json = store.toJSON();
    
    // Generate thumbnail (low res preview)
    store.toDataURL({ pixelRatio: 0.3 }).then(thumbnail => {
      const newTemplate = {
        id: Date.now().toString(),
        name: templateName,
        created: new Date().toISOString(),
        width: store.width,
        height: store.height,
        json: json,
        thumbnail: thumbnail,
        elementCount: json.pages[0]?.children?.length || 0
      };

      const updated = [newTemplate, ...templates];
      setTemplates(updated);
      saveToStorage(updated);
      
      setMessage(`Template "${templateName}" saved!`);
      setTemplateName('');
      setIsSaveDialogOpen(false);
      
      setTimeout(() => setMessage(''), 3000);
    });
  };

  // Upload JSON file
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      // Validate it's a polotno template
      if (!json.pages && !json.json) {
        throw new Error('Invalid template format');
      }

      const templateData = json.json || json;
      
      const newTemplate = {
        id: Date.now().toString(),
        name: file.name.replace('.json', ''),
        created: new Date().toISOString(),
        width: templateData.width || 1080,
        height: templateData.height || 1920,
        json: templateData,
        thumbnail: null, // Could generate from first page
        elementCount: templateData.pages?.[0]?.children?.length || 0,
        source: 'uploaded'
      };

      const updated = [newTemplate, ...templates];
      setTemplates(updated);
      saveToStorage(updated);
      
      setMessage(`Uploaded "${file.name}" successfully!`);
      setSelectedFile(null);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  // Load template into editor
  const loadTemplate = (template) => {
    try {
      store.loadJSON(template.json);
      setMessage(`Loaded "${template.name}"`);
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('Failed to load template');
    }
  };

  // Delete template
  const deleteTemplate = (id, event) => {
    event.stopPropagation();
    if (!confirm('Delete this template?')) return;
    
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveToStorage(updated);
  };

  // Export template as JSON file
  const exportTemplate = (template, event) => {
    event.stopPropagation();
    
    const exportData = {
      name: template.name,
      width: template.width,
      height: template.height,
      pages: template.json.pages || template.json
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Preview template (show in modal)
  const showPreview = (template, event) => {
    event.stopPropagation();
    setPreviewTemplate(template);
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3>My Templates</h3>
      
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <Button 
          intent="primary" 
          icon="floppy-disk"
          onClick={() => setIsSaveDialogOpen(true)}
          fill
        >
          Save Current as Template
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <FileInput
          text={selectedFile ? selectedFile.name : 'Upload JSON Template...'}
          onInputChange={handleFileUpload}
          fill
          buttonText="Browse"
        />
      </div>

      {message && (
        <Callout intent={message.includes('Error') ? 'danger' : 'success'} style={{ marginBottom: 16 }}>
          {message}
        </Callout>
      )}

      <Divider style={{ marginBottom: 16 }} />

      {/* Templates Grid */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <p style={{ color: '#888', marginBottom: 12, fontSize: '12px' }}>
          {templates.length} template{templates.length !== 1 ? 's' : ''} saved
        </p>

        {templates.map(template => (
          <Card 
            key={template.id}
            interactive
            onClick={() => loadTemplate(template)}
            style={{ 
              marginBottom: 12, 
              position: 'relative',
              padding: 12
            }}
          >
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Thumbnail */}
              <div style={{ 
                width: 60, 
                height: 60, 
                background: '#333',
                borderRadius: 4,
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {template.thumbnail ? (
                  <img 
                    src={template.thumbnail} 
                    alt="" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                    <Icon icon="layout" />
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
                  {template.isDefault && <Tag intent="primary" style={{ marginLeft: 8 }}>Default</Tag>}
                  {template.source === 'uploaded' && <Tag intent="warning" style={{ marginLeft: 8 }}>Uploaded</Tag>}
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
                {!template.isDefault && (
                  <Button 
                    small 
                    minimal 
                    icon="trash"
                    intent="danger"
                    onClick={(e) => deleteTemplate(template.id, e)}
                    title="Delete"
                  />
                )}
              </div>
            </div>
          </Card>
        ))}

        {templates.length === 0 && (
          <Callout intent="primary">
            No templates yet. Save your current design or upload a JSON file.
          </Callout>
        )}
      </div>

      {/* Save Dialog */}
      <Dialog 
        isOpen={isSaveDialogOpen} 
        onClose={() => setIsSaveDialogOpen(false)}
        title="Save as Template"
      >
        <div className={Classes.DIALOG_BODY}>
          <p>Save your current canvas design as a reusable template.</p>
          <InputGroup
            large
            placeholder="Template name (e.g., Luxury Listing)"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
          />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
            <Button intent="primary" onClick={saveCurrentTemplate}>Save Template</Button>
          </div>
        </div>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        title={previewTemplate?.name}
        style={{ width: 'auto', maxWidth: '90vw' }}
      >
        <div className={Classes.DIALOG_BODY}>
          {previewTemplate?.thumbnail ? (
            <img 
              src={previewTemplate.thumbnail} 
              alt="Template preview"
              style={{ maxWidth: '100%', maxHeight: '60vh' }}
            />
          ) : (
            <Callout>No preview available</Callout>
          )}
          <div style={{ marginTop: 12 }}>
            <strong>Dimensions:</strong> {previewTemplate?.width}×{previewTemplate?.height}<br/>
            <strong>Elements:</strong> {previewTemplate?.elementCount}<br/>
            <strong>Created:</strong> {previewTemplate?.created && new Date(previewTemplate.created).toLocaleString()}
          </div>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={() => setPreviewTemplate(null)}>Close</Button>
            <Button intent="primary" onClick={() => {
              loadTemplate(previewTemplate);
              setPreviewTemplate(null);
            }}>Load This Template</Button>
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
      <FaSave />
    </SectionTab>
  ),
  Panel: MyTemplatesPanel,
};
