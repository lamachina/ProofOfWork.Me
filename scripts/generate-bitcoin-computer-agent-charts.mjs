import { deflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";

const INPUT = "output/bitcoin-computer-agent-adoption-model.md";
const OUTPUT_DIR = "output";

const width = 1600;
const height = 900;
const margin = { left: 130, right: 150, top: 150, bottom: 115 };
const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;

const colors = {
  fee001: "#0f766e",
  fee0001: "#2563eb",
  fee00001: "#c2410c",
  fee000001: "#7c3aed",
  sats: "#0f766e",
  btc: "#2563eb",
  usd: "#c2410c",
  powids: "#7c3aed",
};

const font = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10011", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
};

function cleanNumber(value) {
  return Number(String(value).replace(/[$,%]/g, "").replace(/,/g, "").trim());
}

function parseMarkdown() {
  const markdown = readFileSync(INPUT, "utf8");
  const currentNodes = cleanNumber(markdown.match(/Reachable Bitcoin nodes: ([\d,]+)/)?.[1]);
  const currentBtcUsd = cleanNumber(markdown.match(/BTC\/USD used: \$([\d,.]+)/)?.[1]);
  const currentPowids = cleanNumber(markdown.match(/Confirmed PowIDs: ([\d,]+)/)?.[1]);
  const growthRows = parseTable(markdown, "| Horizon | Years | Future Bitcoin nodes |");
  const valueRows = parseTable(markdown, "| Horizon | Adoption | Fee tier |");

  return {
    currentNodes,
    currentBtcUsd,
    currentPowids,
    growthRows: growthRows.map((row) => ({
      horizon: row[0],
      years: cleanNumber(row[1]),
      futureNodes: cleanNumber(row[2]),
      futureAgentNodes: cleanNumber(row[3]),
      adoption: row[4],
      powids: cleanNumber(row[5]),
      futureBtcUsd: cleanNumber(row[6]),
    })),
    valueRows: valueRows.map((row) => ({
      horizon: row[0],
      adoption: row[1],
      fee: row[2],
      futureNodes: cleanNumber(row[3]),
      futureBtcUsd: cleanNumber(row[4]),
      powids: cleanNumber(row[5]),
      idSats: cleanNumber(row[6]),
      mailSats: cleanNumber(row[7]),
      driveSats: cleanNumber(row[8]),
      totalSats: cleanNumber(row[9]),
      btc: cleanNumber(row[10]),
      usd: cleanNumber(row[11]),
    })),
  };
}

function parseTable(markdown, headerStart) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line.startsWith(headerStart));
  if (start < 0) {
    throw new Error(`Table not found: ${headerStart}`);
  }

  const rows = [];
  for (let i = start + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith("|")) break;
    rows.push(
      line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim()),
    );
  }
  return rows;
}

function buildFeeLines(rows, key) {
  const fees = ["0.01", "0.001", "0.0001", "0.00001"];
  const feeColors = [colors.fee001, colors.fee0001, colors.fee00001, colors.fee000001];
  return fees.map((fee, index) => ({
    label: `${fee} sat/vB`,
    color: feeColors[index],
    points: rows.filter((row) => row.fee === fee).map((row) => ({ xLabel: row.horizon, y: row[key] })),
  }));
}

function buildGrowthLines(model) {
  return [
    {
      label: "Nodes multiple",
      color: colors.sats,
      points: model.growthRows.map((row) => ({ xLabel: row.horizon, y: row.futureNodes / model.currentNodes })),
    },
    {
      label: "BTC/USD multiple",
      color: colors.usd,
      points: model.growthRows.map((row) => ({ xLabel: row.horizon, y: row.futureBtcUsd / model.currentBtcUsd })),
    },
    {
      label: "PowID multiple",
      color: colors.powids,
      points: model.growthRows.map((row) => ({ xLabel: row.horizon, y: row.powids / model.currentPowids })),
    },
  ];
}

function makeCharts() {
  const model = parseMarkdown();
  const horizons = model.growthRows.map((row) => row.horizon);

  const charts = [
    {
      filename: "bitcoin-computer-agent-value-sats-line",
      title: "Bitcoin Computer Value In Sats",
      subtitle: "Successful network effect, exponential nodes, exponential BTC/USD, log scale",
      yLabel: "sats",
      horizons,
      lines: buildFeeLines(model.valueRows, "totalSats"),
    },
    {
      filename: "bitcoin-computer-agent-value-btc-line",
      title: "Bitcoin Computer Value In BTC",
      subtitle: "Sats-denominated valuation converted to BTC unit of account, log scale",
      yLabel: "BTC",
      horizons,
      lines: buildFeeLines(model.valueRows, "btc"),
    },
    {
      filename: "bitcoin-computer-agent-value-usd-line",
      title: "Bitcoin Computer Value In USD",
      subtitle: "Future BTC/USD compounds at 30 percent CAGR, log scale",
      yLabel: "USD",
      horizons,
      lines: buildFeeLines(model.valueRows, "usd"),
    },
    {
      filename: "bitcoin-computer-agent-growth-inputs-line",
      title: "Agent Adoption Growth Inputs",
      subtitle: "Multiples from current baseline: nodes, BTC/USD, and PowIDs, log scale",
      yLabel: "multiple",
      horizons,
      lines: buildGrowthLines(model),
    },
  ];

  for (const chart of charts) {
    writeFileSync(`${OUTPUT_DIR}/${chart.filename}.svg`, renderSvg(chart));
    writeFileSync(`${OUTPUT_DIR}/${chart.filename}.png`, renderPng(chart));
  }
}

function getDomain(lines) {
  const values = lines.flatMap((line) => line.points.map((point) => point.y)).filter((value) => value > 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const minLog = Math.floor(Math.log10(min));
  const maxLog = Math.ceil(Math.log10(max));
  return { minLog, maxLog };
}

function yScale(value, domain) {
  const logValue = Math.log10(value);
  return margin.top + ((domain.maxLog - logValue) / (domain.maxLog - domain.minLog)) * plotHeight;
}

function xScale(index, count) {
  if (count === 1) return margin.left + plotWidth / 2;
  return margin.left + (index / (count - 1)) * plotWidth;
}

function yTicks(domain) {
  const span = domain.maxLog - domain.minLog;
  const step = span > 18 ? 4 : span > 10 ? 2 : 1;
  const ticks = [];
  for (let exponent = domain.minLog; exponent <= domain.maxLog; exponent += step) {
    ticks.push({ exponent, value: 10 ** exponent });
  }
  if (ticks.at(-1)?.exponent !== domain.maxLog) {
    ticks.push({ exponent: domain.maxLog, value: 10 ** domain.maxLog });
  }
  return ticks;
}

function renderSvg(chart) {
  const domain = getDomain(chart.lines);
  const ticks = yTicks(domain);
  const count = chart.horizons.length;
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

  const grid = ticks
    .map((tick) => {
      const y = yScale(tick.value, domain);
      return `<line x1="${margin.left}" y1="${y.toFixed(1)}" x2="${width - margin.right}" y2="${y.toFixed(1)}" stroke="#d7dee8" stroke-width="1"/><text x="${margin.left - 18}" y="${(y + 5).toFixed(1)}" text-anchor="end" font-size="18" fill="#475569">1e${tick.exponent}</text>`;
    })
    .join("\n");

  const xLabels = chart.horizons
    .map((label, index) => {
      const x = xScale(index, count);
      return `<line x1="${x.toFixed(1)}" y1="${margin.top}" x2="${x.toFixed(1)}" y2="${height - margin.bottom}" stroke="#edf2f7" stroke-width="1"/><text x="${x.toFixed(1)}" y="${height - margin.bottom + 44}" text-anchor="middle" font-size="20" fill="#334155">${esc(label)}</text>`;
    })
    .join("\n");

  const paths = chart.lines
    .map((line) => {
      const d = line.points
        .map((point, index) => `${index === 0 ? "M" : "L"} ${xScale(index, count).toFixed(1)} ${yScale(point.y, domain).toFixed(1)}`)
        .join(" ");
      const dots = line.points
        .map((point, index) => `<circle cx="${xScale(index, count).toFixed(1)}" cy="${yScale(point.y, domain).toFixed(1)}" r="5" fill="${line.color}" stroke="#ffffff" stroke-width="2"/>`)
        .join("\n");
      return `<path d="${d}" fill="none" stroke="${line.color}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>\n${dots}`;
    })
    .join("\n");

  const legend = chart.lines
    .map((line, index) => {
      const x = margin.left + index * 330;
      return `<line x1="${x}" y1="116" x2="${x + 48}" y2="116" stroke="${line.color}" stroke-width="6" stroke-linecap="round"/><text x="${x + 62}" y="123" font-size="21" fill="#0f172a">${esc(line.label)}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="#f8fafc"/>
<text x="${margin.left}" y="54" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="39" font-weight="800" fill="#0f172a">${esc(chart.title)}</text>
<text x="${margin.left}" y="87" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="22" fill="#475569">${esc(chart.subtitle)}</text>
${legend}
<rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
${grid}
${xLabels}
<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#334155" stroke-width="2"/>
<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#334155" stroke-width="2"/>
<text x="${margin.left}" y="${height - 28}" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="18" fill="#64748b">Source: output/bitcoin-computer-agent-adoption-model.md</text>
<text x="${width - margin.right}" y="${height - 28}" text-anchor="end" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="18" fill="#64748b">Y-axis: ${esc(chart.yLabel)} on log scale</text>
${paths}
</svg>
`;
}

function renderPng(chart) {
  const canvas = createCanvas(width, height, "#f8fafc");
  const domain = getDomain(chart.lines);
  const ticks = yTicks(domain);
  const count = chart.horizons.length;

  drawText(canvas, chart.title, margin.left, 37, 5, "#0f172a");
  drawText(canvas, chart.subtitle, margin.left, 77, 3, "#475569");

  chart.lines.forEach((line, index) => {
    const x = margin.left + index * 330;
    drawLine(canvas, x, 116, x + 48, 116, line.color, 6);
    drawText(canvas, line.label, x + 64, 104, 3, "#0f172a");
  });

  fillRect(canvas, margin.left, margin.top, plotWidth, plotHeight, "#ffffff");
  strokeRect(canvas, margin.left, margin.top, plotWidth, plotHeight, "#cbd5e1", 1);

  ticks.forEach((tick) => {
    const y = yScale(tick.value, domain);
    drawLine(canvas, margin.left, y, width - margin.right, y, "#d7dee8", 1);
    drawText(canvas, `1E${tick.exponent}`, margin.left - 92, y - 10, 3, "#475569");
  });

  chart.horizons.forEach((label, index) => {
    const x = xScale(index, count);
    drawLine(canvas, x, margin.top, x, height - margin.bottom, "#edf2f7", 1);
    drawTextCentered(canvas, label, x, height - margin.bottom + 30, 3, "#334155");
  });

  drawLine(canvas, margin.left, margin.top, margin.left, height - margin.bottom, "#334155", 2);
  drawLine(canvas, margin.left, height - margin.bottom, width - margin.right, height - margin.bottom, "#334155", 2);

  chart.lines.forEach((line) => {
    line.points.forEach((point, index) => {
      if (index === 0) return;
      const previous = line.points[index - 1];
      drawLine(canvas, xScale(index - 1, count), yScale(previous.y, domain), xScale(index, count), yScale(point.y, domain), line.color, 5);
    });
    line.points.forEach((point, index) => {
      drawCircle(canvas, xScale(index, count), yScale(point.y, domain), 7, "#ffffff");
      drawCircle(canvas, xScale(index, count), yScale(point.y, domain), 5, line.color);
    });
  });

  drawText(canvas, "SOURCE: OUTPUT/BITCOIN-COMPUTER-AGENT-ADOPTION-MODEL.MD", margin.left, height - 48, 2, "#64748b");
  drawText(canvas, `Y-AXIS: ${chart.yLabel} ON LOG SCALE`, width - 520, height - 48, 2, "#64748b");

  return encodePng(canvas);
}

function createCanvas(w, h, background) {
  const data = Buffer.alloc(w * h * 3);
  const [r, g, b] = hexToRgb(background);
  for (let i = 0; i < data.length; i += 3) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  return { width: w, height: h, data };
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16)];
}

function setPixel(canvas, x, y, color) {
  const xx = Math.round(x);
  const yy = Math.round(y);
  if (xx < 0 || yy < 0 || xx >= canvas.width || yy >= canvas.height) return;
  const [r, g, b] = hexToRgb(color);
  const index = (yy * canvas.width + xx) * 3;
  canvas.data[index] = r;
  canvas.data[index + 1] = g;
  canvas.data[index + 2] = b;
}

function fillRect(canvas, x, y, w, h, color) {
  for (let yy = Math.round(y); yy < Math.round(y + h); yy += 1) {
    for (let xx = Math.round(x); xx < Math.round(x + w); xx += 1) {
      setPixel(canvas, xx, yy, color);
    }
  }
}

function strokeRect(canvas, x, y, w, h, color, thickness) {
  drawLine(canvas, x, y, x + w, y, color, thickness);
  drawLine(canvas, x + w, y, x + w, y + h, color, thickness);
  drawLine(canvas, x + w, y + h, x, y + h, color, thickness);
  drawLine(canvas, x, y + h, x, y, color, thickness);
}

function drawCircle(canvas, cx, cy, radius, color) {
  const r = Math.ceil(radius);
  for (let y = -r; y <= r; y += 1) {
    for (let x = -r; x <= r; x += 1) {
      if (x * x + y * y <= radius * radius) setPixel(canvas, cx + x, cy + y, color);
    }
  }
}

function drawLine(canvas, x1, y1, x2, y2, color, thickness = 1) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  const radius = Math.max(1, Math.round(thickness / 2));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (thickness <= 1) setPixel(canvas, x, y, color);
    else drawCircle(canvas, x, y, radius, color);
  }
}

function drawText(canvas, text, x, y, scale, color) {
  let cursor = Math.round(x);
  const normalized = String(text).toUpperCase();
  for (const char of normalized) {
    const glyph = font[char] || font[" "];
    glyph.forEach((row, rowIndex) => {
      [...row].forEach((pixel, columnIndex) => {
        if (pixel !== "1") return;
        fillRect(canvas, cursor + columnIndex * scale, y + rowIndex * scale, scale, scale, color);
      });
    });
    cursor += 6 * scale;
  }
}

function drawTextCentered(canvas, text, x, y, scale, color) {
  const textWidth = String(text).length * 6 * scale;
  drawText(canvas, text, x - textWidth / 2, y, scale, color);
}

function encodePng(canvas) {
  const raw = Buffer.alloc((canvas.width * 3 + 1) * canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    const rawOffset = y * (canvas.width * 3 + 1);
    raw[rawOffset] = 0;
    canvas.data.copy(raw, rawOffset + 1, y * canvas.width * 3, (y + 1) * canvas.width * 3);
  }

  const chunks = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr(canvas.width, canvas.height)),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ];
  return Buffer.concat(chunks);
}

function ihdr(w, h) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(w, 0);
  buffer.writeUInt32BE(h, 4);
  buffer[8] = 8;
  buffer[9] = 2;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

makeCharts();
