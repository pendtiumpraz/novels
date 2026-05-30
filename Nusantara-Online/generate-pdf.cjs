const PDFDocument = require('/root/.nvm/versions/node/v22.22.1/lib/node_modules/pdfkit');
const fs = require('fs');
const path = require('path');

const FONT_REGULAR = '/usr/share/fonts/dejavu/DejaVuSerif.ttf';
const FONT_BOLD = '/usr/share/fonts/dejavu/DejaVuSerif-Bold.ttf';
const FONT_ITALIC = '/usr/share/fonts/dejavu/DejaVuSerif-Italic.ttf';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_TOP = 72;
const MARGIN_BOTTOM = 72;
const MARGIN_LEFT = 72;
const MARGIN_RIGHT = 72;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const FONT_SIZE = 12;

const [,, inputFile, outputDir] = process.argv;
if (!inputFile || !outputDir) { console.error('Usage: node generate-pdf.cjs <input.md> <output-dir>'); process.exit(1); }

const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');
const filename = path.parse(inputFile).name;

// Extract info
let title = 'NUSANTARA ONLINE';
let babNum = filename.replace(/^BAB/, '').replace(/^MC\d_BAB(\d+)/, '$1');
const headerMatch = content.match(/^# (.+)/m);
if (headerMatch) title = headerMatch[1];

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: MARGIN_TOP, bottom: 50, left: MARGIN_LEFT, right: MARGIN_RIGHT },
  info: {
    Title: `${filename} — ${title}`,
    Author: 'Galih Prasetyo',
    Subject: 'Nusantara Online Novel',
    Creator: 'Ndak A-Bot'
  }
});

const outputPath = path.join(outputDir, `${filename}.pdf`);
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

let y = MARGIN_TOP;

// ============ COVER PAGE ============
y = PAGE_HEIGHT * 0.15;
doc.font(FONT_BOLD).fontSize(36).fillColor('#1a1a1a');
doc.text('NUSANTARA ONLINE', MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });

y += 50;
doc.font(FONT_REGULAR).fontSize(18).fillColor('#555');
doc.text(title, MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });

y += 35;
doc.font(FONT_ITALIC).fontSize(12).fillColor('#888');
const babDisplay = filename.replace(/-/g, ' ').replace(/_/g, ' ');
doc.text(babDisplay, MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });

y += 80;
doc.font(FONT_REGULAR).fontSize(11).fillColor('#999');
doc.text('Penulis: Galih Prasetyo', MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
y += 20;
doc.text('Genre: LitRPG / Isekai / Anime Fantasy', MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
y += 20;
const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
doc.text(`Tanggal: ${dateStr}`, MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });

// Cover art prompt section
y += 80;
doc.font(FONT_ITALIC).fontSize(9).fillColor('#aaa');
doc.text('— Cover GPT Image 2 Prompt —', MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
y += 20;

// Generate cover prompt based on content
let mainChar = 'TRIKARA (Arya, Bima, Chandra)';
let sceneHint = 'gerbang Nusantara Online';
if (content.toLowerCase().includes('arya') && !content.toLowerCase().includes('bima') && !content.toLowerCase().includes('chandra')) mainChar = 'ARYA — jubah biru, kacamata, keris petir';
else if (content.toLowerCase().includes('bima') && !content.toLowerCase().includes('arya') && !content.toLowerCase().includes('chandra')) mainChar = 'BIMA — putih emas, kipas, senyum';
else if (content.toLowerCase().includes('chandra') && !content.toLowerCase().includes('arya') && !content.toLowerCase().includes('bima')) mainChar = 'CHANDRA — hitam abu, busur, rumus';

if (content.toLowerCase().includes('hutan') || content.toLowerCase().includes('forest')) sceneHint = 'Hening Forest — Sumatra, pohon raksasa bercahaya';
else if (content.toLowerCase().includes('kamar')) sceneHint = 'Kamar Pribadi — base camp awal';
else if (content.toLowerCase().includes('laut') || content.toLowerCase().includes('ombak')) sceneHint = 'Laut Selatan — Bali, ombak raksasa';
else if (content.toLowerCase().includes('kota') || content.toLowerCase().includes('pasar') || content.toLowerCase().includes('market')) sceneHint = 'Kota Nusantara — Kalimantan, pasar terapung';
else if (content.toLowerCase().includes('boss') || content.toLowerCase().includes('guntur') || content.toLowerCase().includes('prabu')) sceneHint = 'Suralaya — Candi Borobudur terbang, boss fight';

const coverPrompt = `${mainChar}, ${sceneHint}, anime character art, consistent character design, cinematic lighting, epic pose, Nusantara Online game world background, high detail, vibrant colors, A4 book cover composition --ar 210:297`;

doc.font(FONT_REGULAR).fontSize(8).fillColor('#bbb');
// Wrap prompt text
doc.fontSize(8).text(coverPrompt, MARGIN_LEFT + 20, y, {
  width: CONTENT_WIDTH - 40, align: 'center', lineGap: 1
});

// ============ CONTENT ============
doc.addPage();
y = MARGIN_TOP + 30;

function addPageBreak() { doc.addPage(); y = MARGIN_TOP + 30; }
function needsNewPage(el = 3) { return y + (FONT_SIZE * 1.8 * el) > PAGE_HEIGHT - MARGIN_BOTTOM - 30; }

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  if (line.startsWith('# ') && i > 0) { continue; }
  else if (line.startsWith('## ')) {
    if (needsNewPage(2)) addPageBreak();
    doc.font(FONT_BOLD).fontSize(16).fillColor('#1a1a1a');
    doc.text(line.replace('## ', ''), MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
    y = doc.y + 20;
  }
  else if (line.startsWith('---')) {
    if (needsNewPage(2)) addPageBreak();
    doc.moveTo(MARGIN_LEFT, y).lineTo(PAGE_WIDTH - MARGIN_RIGHT, y).strokeColor('#ccc').stroke();
    y += 20;
  }
  else if (line === '') { y += 8; }
  else if (line.startsWith('*') && line.endsWith('*') && !line.includes('**')) {
    if (needsNewPage(2)) addPageBreak();
    doc.font(FONT_ITALIC).fontSize(FONT_SIZE).fillColor('#555');
    doc.text(line.slice(1, -1), MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center', lineGap: 2 });
    y = doc.y + 8;
  }
  else {
    const processed = line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
    if (needsNewPage()) addPageBreak();
    doc.font(FONT_REGULAR).fontSize(FONT_SIZE).fillColor('#1a1a1a');
    const isFirstAH = i === 0 || (i > 0 && lines[i-1].trim().startsWith('## '));
    const indent = isFirstAH ? 0 : 20;
    doc.text(processed, MARGIN_LEFT + indent, y, { width: CONTENT_WIDTH - indent, align: 'justify', lineGap: 2 });
    y = doc.y + 6;
  }
}

// Page numbers
const range = doc.bufferedPageRange();
for (let p = range.start; p < range.start + range.count; p++) {
  doc.switchToPage(p);
  if (p > 0) {
    doc.font(FONT_ITALIC).fontSize(9).fillColor('#999');
    doc.text(`— ${p} —`, MARGIN_LEFT, PAGE_HEIGHT - 45, { width: CONTENT_WIDTH, align: 'center' });
  }
}

doc.end();
stream.on('finish', () => {
  const stats = fs.statSync(outputPath);
  console.log(`PDF: ${outputPath}`);
  console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`Pages: ${range.count}`);
  console.log(`Cover prompt: ${coverPrompt.substring(0, 60)}...`);
});
