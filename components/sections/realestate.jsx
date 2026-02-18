// components/sections/realestate.jsx

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { InputGroup, Button, Callout, Spinner, FormGroup } from '@blueprintjs/core';

const CORS_PROXY = "https://cors.ericmwangi13.workers.dev/?url=";

export const RealEstatePanel = observer(({ store }) => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const scrapeListing = async () => {
    if (!url.trim() || !url.includes("danco.co.ke/listing/")) {
      setError("Please enter a valid Danco.co.ke listing URL");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const proxyUrl = CORS_PROXY + encodeURIComponent(url.trim());
      const res = await fetch(proxyUrl, {
        headers: {
          "Accept": "text/html",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });

      if (!res.ok) {
        throw new Error(`Proxy error ${res.status}`);
      }

      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Extract main data
      const title = doc.querySelector("h1.page-title")?.textContent?.trim() || "";
      const price = doc.querySelector("span.price")?.textContent?.trim() || "";
      const description = doc.querySelector(".property-description")?.textContent?.trim() || "";

      // Details (bedrooms, bathrooms, area)
      const details = {};
      doc.querySelectorAll(".property-detail-item").forEach(item => {
        const label = item.querySelector(".label")?.textContent?.trim();
        const value = item.querySelector(".value")?.textContent?.trim();
        if (label && value) {
          details[label.toLowerCase()] = value;
        }
      });

      // Images – proxy them too
      const images = [];
      const mainImg = doc.querySelector(".main-image img, .featured-image img");
      if (mainImg?.src) {
        images.push(CORS_PROXY + encodeURIComponent(mainImg.src));
      }

      doc.querySelectorAll(".gallery img, .thumbnail img").forEach(img => {
        if (img.src && !images.includes(img.src)) {
          images.push(CORS_PROXY + encodeURIComponent(img.src));
        }
      });

      // Features list
      const features = Array.from(doc.querySelectorAll(".feature-item, .amenity-item, li")).map(
        li => li.textContent?.trim()
      ).filter(Boolean);

      const data = {
        title,
        price,
        bedrooms: details.bedrooms || "?",
        bathrooms: details.bathrooms || "?",
        area: details.area || details["size (ft²)"] || "?",
        description: description.substring(0, 400) + (description.length > 400 ? "..." : ""),
        features: features.slice(0, 8),
        images: images.slice(0, 6)
      };

      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Could not load listing. Possible reasons: invalid URL, site blocked proxy, or network issue.");
    } finally {
      setLoading(false);
    }
  };

  const fillCanvas = () => {
    if (!result) return;

    const page = store.activePage;

    // Title
    page.addElement({
      type: "text",
      text: result.title,
      x: 60,
      y: 40,
      width: 960,
      fontSize: 52,
      fontFamily: "Arial",
      fill: "#ffffff",
      align: "center"
    });

    // Price
    page.addElement({
      type: "text",
      text: result.price,
      x: 60,
      y: 140,
      width: 960,
      fontSize: 72,
      fontFamily: "Arial",
      fill: "#00ff9d",
      align: "center"
    });

    // Beds | Baths | Area
    page.addElement({
      type: "text",
      text: `${result.bedrooms} Bed • ${result.bathrooms} Bath • ${result.area}`,
      x: 60,
      y: 260,
      width: 960,
      fontSize: 38,
      fill: "#cccccc",
      align: "center"
    });

    // Main image
    if (result.images[0]) {
      page.addElement({
        type: "image",
        src: result.images[0],
        x: 0,
        y: 360,
        width: 1080,
        height: 1080
      });
    }

    // Description
    page.addElement({
      type: "text",
      text: result.description,
      x: 60,
      y: 1480,
      width: 960,
      fontSize: 28,
      lineHeight: 1.5,
      fill: "#dddddd"
    });

    // Features (bullet list)
    result.features.forEach((feat, i) => {
      page.addElement({
        type: "text",
        text: `• ${feat}`,
        x: 80,
        y: 1580 + i * 45,
        width: 920,
        fontSize: 26,
        fill: "#aaffcc"
      });
    });

    alert("Listing data added to canvas!\nYou can now edit, reposition, add logo, etc.");
  };

  return (
    <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h3>Real Estate Poster Generator</h3>
      <p style={{ marginBottom: 16, color: '#aaa' }}>
        Paste a Danco.co.ke listing URL to auto-fill poster elements.
      </p>

      <InputGroup
        large
        leftIcon="globe-network"
        placeholder="https://danco.co.ke/listing/..."
        value={url}
        onChange={e => setUrl(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <Button
        large
        intent="primary"
        onClick={scrapeListing}
        loading={loading}
        disabled={loading || !url.trim()}
      >
        {loading ? "Scraping..." : "Load Listing"}
      </Button>

      {error && (
        <Callout intent="danger" style={{ marginTop: 16 }}>
          {error}
        </Callout>
      )}

      {result && (
        <div style={{ marginTop: 24, flex: 1, overflowY: 'auto' }}>
          <Callout intent="success" title="Listing Loaded">
            <strong>{result.title}</strong><br />
            <strong style={{ color: '#00ff9d' }}>{result.price}</strong><br /><br />
            {result.bedrooms} Bed • {result.bathrooms} Bath • {result.area}<br /><br />
            <strong>Images found:</strong> {result.images.length}<br />
            <strong>Features:</strong> {result.features.length}
          </Callout>

          <Button
            large
            intent="success"
            onClick={fillCanvas}
            style={{ marginTop: 20, width: '100%' }}
          >
            Fill Current Canvas with this Listing
          </Button>
        </div>
      )}
    </div>
  );
});

export const RealEstateSection = {
  name: 'realestate',
  Tab: (props) => (
    <SectionTab name="Real Estate" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </SectionTab>
  ),
  Panel: RealEstatePanel,
};