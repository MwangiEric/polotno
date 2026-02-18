// components/Editor.jsx

import React from 'react';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';

// Your custom sections (all inside components/sections/)
import { ImagApiSection } from './sections/imagapi';
import { BtchImgSection } from './sections/btchimg';
import { JsonViewerSection } from './sections/json-viewer';

import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css";

const store = createStore({
  key: process.env.NEXT_PUBLIC_POLOTNO_API_KEY,
  showCredit: false,
});

store.addPage();

const mySections = [
  ...DEFAULT_SECTIONS,          // Official Polotno: Templates, Text, Upload, Backgrounds, Elements, etc.
  ImagApiSection,               // Your custom Assets / image search
  BtchImgSection,               // Your custom Batch Images
  JsonViewerSection,            // Raw JSON viewer + Pillow export
FreeIconsSection,
];

export default function Editor() {
  return (
    <PolotnoContainer style={{ width: "100vw", height: "100vh" }}>
      <SidePanelWrap>
        <SidePanel 
          store={store} 
          sections={mySections}
          defaultSection="templates"   // Opens official templates gallery first
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