// components/sections/brands-panel.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { 
  Button, Card, FormGroup, InputGroup,
  HTMLSelect, Callout, Tag
} from '@blueprintjs/core';

const generateId = () => Math.random().toString(36).substr(2, 9);

// Brand configurations
const BRANDS = {
  kenyatronics: {
    name: "Kenyatronics",
    phone: "0733 565 861",
    whatsapp: "0733 565 861",
    webaddress: "www.kenyatronics.com",
    logo: "https://ik.imagekit.io/ericmwangi/tklogo.png",
    primary: "#52D3D8",
    secondary: "#F39C12",
    fontHeader: "Archivo Black",
    fontBody: "Roboto Condensed",
    description: "Electronics & Tech Retailer"
  },
  tripplek: {
    name: "Tripple K Communications",
    phone: "0733 565 861",
    whatsapp: "0733 565 861",
    webaddress: "www.tripplek.co.ke",
    logo: "https://ik.imagekit.io/ericmwangi/tklogo.png",
    primary: "#8B1A1A",
    secondary: "#45B39D",
    fontHeader: "Comfortaa",
    fontBody: "Montserrat",
    description: "Mobile Phones & Accessories"
  }
};

// Decode HTML entities
const decodeHtmlEntities = (text) => {
  if (!text) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

export const BrandsPanel = observer(({ store }) => {
  const [selectedBrand, setSelectedBrand] = useState('kenyatronics');
  const [customPrice, setCustomPrice] = useState('');
  const [message, setMessage] = useState('');

  const getCurrentPage = () => {
    return store.activePage || store.addPage();
  };

  const addOrUpdateElement = (page, name, config) => {
    // Find existing element by name
    let el = page.children.find(c => c.name === name);
    if (el) {
      el.set(config);
      return el;
    } else {
      return page.addElement({ name, id: generateId(), ...config });
    }
  };

  const generateTemplate = () => {
    const brand = BRANDS[selectedBrand];
    const page = getCurrentPage();
    
    // Set canvas size (Instagram square)
    page.set({ width: 1080, height: 1080 });

    // 1. Background
    addOrUpdateElement(page, 'bg', {
      type: 'rect',
      x: 0, y: 0, width: 1080, height: 1080,
      fill: '#000000',
      selectable: false,
      alwaysOnTop: false
    });

    // 2. Logo at top
    addOrUpdateElement(page, 'logo', {
      type: 'image',
      src: brand.logo,
      x: 440, y: 30, width: 200, height: 80,
      keepRatio: true
    });

    // 3. Brand name header
    addOrUpdateElement(page, '{{name}}', {
      type: 'text',
      text: brand.name,
      x: 0, y: 130, width: 1080,
      fontSize: 60,
      fontFamily: brand.fontHeader,
      align: 'center',
      fill: brand.primary,
      fontWeight: 'bold'
    });

    // 4. Main product image placeholder (center, large, white border)
    addOrUpdateElement(page, '{{image1}}', {
      type: 'image',
      src: '', // Empty, to be filled by Gadgets search
      x: 140, y: 220, width: 800, height: 600,
      keepRatio: true,
      borderColor: '#ffffff',
      borderWidth: 12,
      shadowEnabled: true,
      shadowBlur: 20,
      shadowColor: 'rgba(0,0,0,0.3)'
    });

    // 5. Price tag (bottom right of image)
    const priceText = customPrice ? `KSh ${customPrice}` : '{{price}}';
    addOrUpdateElement(page, '{{price}}', {
      type: 'text',
      text: priceText,
      x: 700, y: 750,
      fontSize: 80,
      fontFamily: brand.fontHeader,
      fill: brand.secondary,
      fontWeight: 'bold',
      shadowEnabled: true,
      shadowBlur: 10
    });

    // 6. Specs list (left side, below image)
    for (let i = 1; i <= 4; i++) {
      addOrUpdateElement(page, `{{spec${i}}}`, {
        type: 'text',
        text: `{{spec${i}}}`,
        x: 100, y: 840 + (i * 50),
        fontSize: 28,
        fontFamily: brand.fontBody,
        fill: '#FFFFFF',
        width: 500
      });
    }

    // 7. Footer bar with contact info
    // Footer background
    addOrUpdateElement(page, 'footer-bg', {
      type: 'rect',
      x: 0, y: 1000, width: 1080, height: 80,
      fill: brand.primary,
      opacity: 0.2
    });

    // Phone
    addOrUpdateElement(page, 'icon-phone', {
      type: 'svg',
      src: 'https://api.iconify.design/mdi/phone.svg',
      x: 80, y: 1015, width: 35, height: 35,
      fill: brand.secondary
    });

    addOrUpdateElement(page, '{{phone}}', {
      type: 'text',
      text: brand.phone,
      x: 125, y: 1020,
      fontSize: 24,
      fontFamily: brand.fontBody,
      fill: '#FFFFFF'
    });

    // WhatsApp
    addOrUpdateElement(page, 'icon-whatsapp', {
      type: 'svg',
      src: 'https://api.iconify.design/mdi/whatsapp.svg',
      x: 380, y: 1015, width: 35, height: 35,
      fill: '#25D366' // WhatsApp green
    });

    addOrUpdateElement(page, '{{whatsapp}}', {
      type: 'text',
      text: brand.whatsapp,
      x: 425, y: 1020,
      fontSize: 24,
      fontFamily: brand.fontBody,
      fill: '#FFFFFF'
    });

    // Website
    addOrUpdateElement(page, 'icon-web', {
      type: 'svg',
      src: 'https://api.iconify.design/mdi/web.svg',
      x: 680, y: 1015, width: 35, height: 35,
      fill: brand.secondary
    });

    addOrUpdateElement(page, '{{webaddress}}', {
      type: 'text',
      text: brand.webaddress,
      x: 725, y: 1020,
      fontSize: 24,
      fontFamily: brand.fontBody,
      fill: '#FFFFFF'
    });

    setMessage(`${brand.name} template created! Now use Gadgets search to fill product data.`);
    setTimeout(() => setMessage(''), 3000);
  };

  const brand = BRANDS[selectedBrand];

  return (
    <div style={{ height: '100%', padding: 16, background: '#1a1a1b', color: 'white' }}>
      <h3 style={{ margin: '0 0 16px 0' }}>Brand Templates</h3>
      
      <FormGroup label="Select Brand">
        <HTMLSelect
          fill
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          options={[
            { value: 'kenyatronics', label: 'Kenyatronics' },
            { value: 'tripplek', label: 'Tripple K Communications' }
          ]}
        />
      </FormGroup>

      <Card style={{ marginBottom: 16, background: '#2d2d2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <img 
            src={brand.logo} 
            alt={brand.name}
            style={{ width: 60, height: 40, objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontWeight: 'bold', color: brand.primary }}>{brand.name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{brand.description}</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <Tag minimal style={{ background: brand.primary, color: '#000' }}>
            Primary
          </Tag>
          <Tag minimal style={{ background: brand.secondary, color: '#000' }}>
            Secondary
          </Tag>
        </div>

        <div style={{ fontSize: 11, color: '#aaa' }}>
          <div>📞 {brand.phone}</div>
          <div>🌐 {brand.webaddress}</div>
        </div>
      </Card>

      <FormGroup label="Default Price (optional)" helperText="Leave empty to use {{price}} variable">
        <InputGroup
          placeholder="e.g., 45000"
          value={customPrice}
          onChange={(e) => setCustomPrice(e.target.value.replace(/[^0-9]/g, ''))}
        />
      </FormGroup>

      <Button 
        fill 
        large 
        intent="primary"
        onClick={generateTemplate}
        style={{ 
          backgroundColor: brand.primary,
          color: '#000',
          marginBottom: 12
        }}
      >
        Generate {brand.name} Template
      </Button>

      {message && (
        <Callout intent="success">
          {message}
        </Callout>
      )}

      <div style={{ marginTop: 20, padding: 12, background: '#252525', borderRadius: 4 }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>How to use:</h4>
        <ol style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#aaa' }}>
          <li>Select brand and click Generate</li>
          <li>Switch to <strong>Gadgets</strong> tab</li>
          <li>Search for product (e.g., Samsung S24)</li>
          <li>Click Add to Canvas to auto-fill</li>
          <li>Or use Batch Fill for multiple products</li>
        </ol>
      </div>
    </div>
  );
});

export const BrandsSection = {
  name: 'brands',
  Tab: (props) => (
    <SectionTab name="Brands" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    </SectionTab>
  ),
  Panel: BrandsPanel,
};
