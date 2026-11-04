// Render simulation balance trajectory chart to PNG and SVG (A-10.2 / #172).
import * as fs from "node:fs";
import * as path from "node:path";
import { crc32, deflateSync } from "node:zlib";
import type { ScenarioSummary } from "./types.js";

// Basic 5x7 bitmap font for minimal legend/axis rendering on PNG
const FONT_5X7: Record<string, number[]> = {
  "0": [0x1f, 0x11, 0x11, 0x11, 0x1f],
  "1": [0x00, 0x12, 0x1f, 0x10, 0x00],
  "2": [0x19, 0x15, 0x15, 0x15, 0x12],
  "3": [0x11, 0x15, 0x15, 0x15, 0x1f],
  "4": [0x07, 0x04, 0x04, 0x1f, 0x04],
  "5": [0x17, 0x15, 0x15, 0x15, 0x19],
  "6": [0x1f, 0x15, 0x15, 0x15, 0x19],
  "7": [0x01, 0x01, 0x1d, 0x05, 0x03],
  "8": [0x1f, 0x15, 0x15, 0x15, 0x1f],
  "9": [0x17, 0x15, 0x15, 0x15, 0x1f],
  "A": [0x1f, 0x05, 0x05, 0x05, 0x1f],
  "B": [0x1f, 0x15, 0x15, 0x15, 0x0a],
  "C": [0x0e, 0x11, 0x11, 0x11, 0x11],
  "D": [0x1f, 0x11, 0x11, 0x11, 0x0e],
  "E": [0x1f, 0x15, 0x15, 0x15, 0x11],
  "F": [0x1f, 0x05, 0x05, 0x05, 0x01],
  "G": [0x0e, 0x11, 0x15, 0x15, 0x1d],
  "H": [0x1f, 0x04, 0x04, 0x04, 0x1f],
  "I": [0x00, 0x11, 0x1f, 0x11, 0x00],
  "L": [0x1f, 0x10, 0x10, 0x10, 0x10],
  "M": [0x1f, 0x02, 0x04, 0x02, 0x1f],
  "N": [0x1f, 0x02, 0x04, 0x08, 0x1f],
  "O": [0x0e, 0x11, 0x11, 0x11, 0x0e],
  "P": [0x1f, 0x05, 0x05, 0x05, 0x02],
  "R": [0x1f, 0x05, 0x05, 0x0d, 0x12],
  "S": [0x12, 0x15, 0x15, 0x15, 0x09],
  "T": [0x01, 0x01, 0x1f, 0x01, 0x01],
  "U": [0x0f, 0x10, 0x10, 0x10, 0x0f],
  "V": [0x07, 0x08, 0x10, 0x08, 0x07],
  "W": [0x1f, 0x08, 0x04, 0x08, 0x1f],
  "X": [0x11, 0x0a, 0x04, 0x0a, 0x11],
  "Y": [0x03, 0x04, 0x18, 0x04, 0x03],
  "$": [0x12, 0x2a, 0x7f, 0x2a, 0x24],
  ":": [0x00, 0x0c, 0x00, 0x0c, 0x00],
  "-": [0x04, 0x04, 0x04, 0x04, 0x04],
  " ": [0x00, 0x00, 0x00, 0x00, 0x00],
};

function createPng(width: number, height: number, rgba: Uint8Array): Buffer {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    const srcOffset = y * width * 4;
    for (let x = 0; x < width * 4; x++) {
      rawData[rowOffset + 1 + x] = rgba[srcOffset + x] ?? 0;
    }
  }

  const makeChunk = (type: string, data: Buffer): Buffer => {
    const typeBuf = Buffer.from(type, "ascii");
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(rawData);

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", idat),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function renderChartSvg(summaries: ScenarioSummary[]): string {
  const width = 800;
  const height = 450;
  const margin = { top: 60, right: 40, bottom: 60, left: 80 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  let maxVal = 0;
  for (const s of summaries) {
    for (const v of s.averageMonthlyBalanceUsd) {
      if (v > maxVal) maxVal = v;
    }
  }
  maxVal = Math.ceil(maxVal / 500) * 500;
  if (maxVal === 0) maxVal = 1000;

  const colors: Record<string, string> = {
    normal: "#10b981", // Emerald
    bad_year: "#ef4444", // Red
    exit_wave: "#3b82f6", // Blue
  };

  const labels: Record<string, string> = {
    normal: "Normal (P_insolvent = 0.00%)",
    bad_year: "Bad Year (Stress)",
    exit_wave: "Exit Wave (35% run at M12)",
  };

  const linesSvg = summaries
    .map((s) => {
      const color = colors[s.scenario] ?? "#888888";
      const pts = s.averageMonthlyBalanceUsd
        .map((val, idx) => {
          const x = margin.left + (idx / (s.months - 1)) * plotWidth;
          const y = margin.top + plotHeight - (val / maxVal) * plotHeight;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");

      const dots = s.averageMonthlyBalanceUsd
        .map((val, idx) => {
          const x = margin.left + (idx / (s.months - 1)) * plotWidth;
          const y = margin.top + plotHeight - (val / maxVal) * plotHeight;
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${color}" />`;
        })
        .join("\n      ");

      return `
      <!-- ${s.scenario} -->
      <polyline fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />
      ${dots}
    `;
    })
    .join("\n");

  // Y-axis grid & labels
  const yTicksCount = 5;
  const yGrid = Array.from({ length: yTicksCount + 1 }).map((_, i) => {
    const val = (maxVal / yTicksCount) * i;
    const y = margin.top + plotHeight - (val / maxVal) * plotHeight;
    return `
      <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#334155" stroke-dasharray="4 4" stroke-width="1" />
      <text x="${margin.left - 12}" y="${y + 4}" fill="#94a3b8" font-size="12" font-family="monospace" text-anchor="end">$${Math.round(val)}</text>
    `;
  }).join("\n");

  // X-axis ticks
  const xTicks = [1, 6, 12, 18, 24].map((m) => {
    const x = margin.left + ((m - 1) / 23) * plotWidth;
    return `
      <line x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom}" stroke="#1e293b" stroke-width="1" />
      <text x="${x}" y="${height - margin.bottom + 20}" fill="#94a3b8" font-size="12" font-family="monospace" text-anchor="middle">M${m}</text>
    `;
  }).join("\n");

  // Legend
  const legend = summaries
    .map((s, idx) => {
      const color = colors[s.scenario] ?? "#888888";
      const label = labels[s.scenario] ?? s.scenario;
      const lx = margin.left + idx * 230;
      const ly = margin.top - 20;
      return `
      <rect x="${lx}" y="${ly - 9}" width="14" height="14" rx="3" fill="${color}" />
      <text x="${lx + 20}" y="${ly + 2}" fill="#e2e8f0" font-size="12" font-weight="500" font-family="sans-serif">${label}</text>
    `;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b0f19" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg)" />

  <!-- Title -->
  <text x="${margin.left}" y="28" fill="#ffffff" font-size="16" font-weight="700" font-family="sans-serif">
    Admit Pool Solvency Trajectory (24-Month Monte Carlo Balance Projection)
  </text>

  <!-- Legend -->
  ${legend}

  <!-- Grid & Axes -->
  ${yGrid}
  ${xTicks}
  <line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#64748b" stroke-width="2" />
  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#64748b" stroke-width="2" />

  <!-- Trajectory lines -->
  ${linesSvg}

  <!-- X axis label -->
  <text x="${width / 2}" y="${height - 15}" fill="#64748b" font-size="11" font-family="sans-serif" text-anchor="middle">Simulation Timeline (Months)</text>
</svg>
`;
}

export function renderChartPng(
  summaries: ScenarioSummary[],
  outPath: string,
): void {
  const width = 800;
  const height = 450;
  const rgba = new Uint8Array(width * height * 4);

  // Fill background #0B0F19
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = 11;
    rgba[i * 4 + 1] = 15;
    rgba[i * 4 + 2] = 25;
    rgba[i * 4 + 3] = 255;
  }

  const setPixel = (
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
    a = 255,
  ) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
    rgba[idx] = r;
    rgba[idx + 1] = g;
    rgba[idx + 2] = b;
    rgba[idx + 3] = a;
  };

  const drawLine = (
    px0: number,
    py0: number,
    px1: number,
    py1: number,
    r: number,
    g: number,
    b: number,
    thickness = 2,
  ) => {
    let x0 = Math.round(px0);
    let y0 = Math.round(py0);
    const x1 = Math.round(px1);
    const y1 = Math.round(py1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      for (let tx = -thickness + 1; tx < thickness; tx++) {
        for (let ty = -thickness + 1; ty < thickness; ty++) {
          setPixel(x0 + tx, y0 + ty, r, g, b);
        }
      }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  };

  const drawChar = (
    ch: string,
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
  ) => {
    const glyph = FONT_5X7[ch.toUpperCase()];
    if (!glyph) return;
    for (let col = 0; col < 5; col++) {
      const byte = glyph[col] ?? 0;
      for (let row = 0; row < 7; row++) {
        if ((byte >> row) & 1) {
          setPixel(x + col, y + row, r, g, b);
        }
      }
    }
  };

  const drawText = (
    str: string,
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
  ) => {
    let curX = x;
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c) {
        drawChar(c, curX, y, r, g, b);
      }
      curX += 6;
    }
  };

  const margin = { top: 60, right: 40, bottom: 60, left: 80 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  let maxVal = 0;
  for (const s of summaries) {
    for (const v of s.averageMonthlyBalanceUsd) {
      if (v > maxVal) maxVal = v;
    }
  }
  maxVal = Math.ceil(maxVal / 500) * 500;
  if (maxVal === 0) maxVal = 1000;

  // Draw axes
  drawLine(
    margin.left,
    height - margin.bottom,
    width - margin.right,
    height - margin.bottom,
    100,
    116,
    139,
    1,
  );
  drawLine(
    margin.left,
    margin.top,
    margin.left,
    height - margin.bottom,
    100,
    116,
    139,
    1,
  );

  // Draw Title
  drawText("ADMIT POOL SOLVENCY TRAJECTORY", margin.left, 24, 255, 255, 255);

  const colorsRgb: Record<string, [number, number, number]> = {
    normal: [16, 185, 129], // emerald
    bad_year: [239, 68, 68], // red
    exit_wave: [59, 130, 246], // blue
  };

  // Draw each scenario trajectory
  for (const s of summaries) {
    const color = colorsRgb[s.scenario] ?? [180, 180, 180];
    for (let m = 0; m < s.months - 1; m++) {
      const v1 = s.averageMonthlyBalanceUsd[m] ?? 0;
      const v2 = s.averageMonthlyBalanceUsd[m + 1] ?? 0;
      const x1 = margin.left + (m / (s.months - 1)) * plotWidth;
      const y1 = margin.top + plotHeight - (v1 / maxVal) * plotHeight;
      const x2 = margin.left + ((m + 1) / (s.months - 1)) * plotWidth;
      const y2 = margin.top + plotHeight - (v2 / maxVal) * plotHeight;
      drawLine(x1, y1, x2, y2, color[0], color[1], color[2], 2);
    }
  }

  // Draw Legend
  summaries.forEach((s, idx) => {
    const color = colorsRgb[s.scenario] ?? [180, 180, 180];
    const lx = margin.left + idx * 230;
    const ly = 42;
    for (let px = 0; px < 10; px++) {
      for (let py = 0; py < 10; py++) {
        setPixel(lx + px, ly + py, color[0], color[1], color[2]);
      }
    }
    drawText(s.scenario.toUpperCase(), lx + 14, ly + 2, 220, 220, 220);
  });

  const pngBuffer = createPng(width, height, rgba);
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outPath, pngBuffer);
}

export function renderChart(
  summaries: ScenarioSummary[],
  outPngPath: string,
): void {
  // Render PNG
  renderChartPng(summaries, outPngPath);
  // Also render SVG alongside PNG
  const outSvgPath = outPngPath.replace(/\.png$/, ".svg");
  const svg = renderChartSvg(summaries);
  fs.writeFileSync(outSvgPath, svg, "utf-8");
}
