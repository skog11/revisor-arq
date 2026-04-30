const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../CLAUDE DESIGN/Propuesta REVISOR ARQ v2.html');
const content = fs.readFileSync(htmlPath, 'utf8');

// Extract style
const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  let css = styleMatch[1];
  fs.appendFileSync(path.join(__dirname, '../app/src/app/globals.css'), css);
}

// Extract script
let scriptContent = '';
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  scriptContent = scriptMatch[1];
}

// Extract body
const bodyMatch = content.match(/<body>([\s\S]*?)<\/body>/);
if (bodyMatch) {
  let bodyHtml = bodyMatch[1];
  
  // Remove script block from body
  bodyHtml = bodyHtml.replace(/<script>[\s\S]*?<\/script>/, '');

  // Convert HTML to JSX
  bodyHtml = bodyHtml.replace(/class=/g, 'className=');
  bodyHtml = bodyHtml.replace(/for=/g, 'htmlFor=');
  
  // Self closing tags
  bodyHtml = bodyHtml.replace(/<br>/g, '<br />');
  bodyHtml = bodyHtml.replace(/<hr>/g, '<hr />');
  bodyHtml = bodyHtml.replace(/<hr className="hr" >/g, '<hr className="hr" />');
  bodyHtml = bodyHtml.replace(/<input([^>]*[^/])>/g, '<input$1/>');

  // Convert HTML comments to JSX comments
  bodyHtml = bodyHtml.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

  // Convert inline styles
  // This is a naive style to object converter, only works for simple "prop: value; prop: value"
  bodyHtml = bodyHtml.replace(/style="([^"]*)"/g, (match, p1) => {
    const rules = p1.split(';').filter(Boolean);
    const obj = {};
    for (let rule of rules) {
      const parts = rule.split(':');
      if (parts.length >= 2) {
        let key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        // camelCase key
        if (key.startsWith('--')) {
          // Keep css variables
        } else {
          key = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        }
        obj[key] = value;
      }
    }
    return `style={${JSON.stringify(obj)}}`;
  });

  const pageComponent = `
"use client";
import React, { useEffect } from 'react';
import { Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google';

const instrumentSerif = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--serif" });
const inter = Inter({ subsets: ["latin"], variable: "--sans" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--mono" });

export default function PropuestaPage() {
  useEffect(() => {
    ${scriptContent}
  }, []);

  return (
    <div className={\`\${instrumentSerif.variable} \${inter.variable} \${jetBrainsMono.variable}\`}>
      ${bodyHtml}
    </div>
  );
}
`;

  fs.writeFileSync(path.join(__dirname, '../app/src/app/page.tsx'), pageComponent);
}
