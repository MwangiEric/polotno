// components/Editor.jsx
import React from 'react';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';

// Blueprint CSS (must be imported once globally)
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css";

// Your custom sections
import { ImagApiSection } from './sections/imagapi';
import { BtchImgSection } from './sections/btchimg';
import { JsonViewerSection } from './sections/json-viewer';
import { PexelsSection } from './sections/pexels';
import { RealEstateSection } from './sections/realestate'; // ← FIXED: Added missing import
import { MyTemplatesSection } from './sections/my-templates';
import { KtSection } from './sections/kt';


// Create Polotno store (use your real key from Vercel env)
const store = createStore({
  key: process.env.NEXT_PUBLIC_POLOTNO_API_KEY || 'demo-key', // fallback for local dev
  showCredit: false,
});

store.addPage();

// All sections (official + your customs)
const mySections = [
  ...DEFAULT_SECTIONS,          // Official: Templates, Text, Upload, Backgrounds, Elements...
  ImagApiSection,               // Your image search / assets
  BtchImgSection,               // Batch images
  JsonViewerSection,            // JSON viewer + export
  PexelsSection,                // Pexels free stock photos
  RealEstateSection,            // Real Estate scraper & poster generator
MyTemplatesSection,
  KtSection,
  GSMSection,
];

export default function Editor() {
  return (
    <PolotnoContainer style={{ width: "100vw", height: "100vh" }}>
      <SidePanelWrap>
        <SidePanel
          store={store}
          sections={mySections}
          defaultSection="templates" // starts on official templates gallery
        />
      </SidePanelWrap>

      <WorkspaceWrap>
        <Toolbar store={store} downloadButtonEnabled />
        <Workspace store={store} />
        <ZoomButtons store={store} />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
}
