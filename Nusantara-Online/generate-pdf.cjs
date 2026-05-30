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
const headerMatch = content.match(/^# (.+)/m);
if (headerMatch) title = headerMatch[1];

// Check for cover image
const coverImagePath = path.join(path.dirname(path.dirname(inputFile)), 'images', 'covers', `${filename}-cover.jpg`);
const trikaraCoverPath = path.join(path.dirname(path.dirname(inputFile)), 'images', 'trikara-cover.jpg');
const hasCoverImage = fs.existsSync(coverImagePath);

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

// Try to embed actual cover image first
let coverUsed = false;
if (hasCoverImage) {
  try {
    // Add cover image filling most of the page
    const imgHeight = PAGE_HEIGHT - 160;
    const imgWidth = imgHeight * (768/1024);
    const imgX = MARGIN_LEFT + (CONTENT_WIDTH - imgWidth) / 2;
    doc.image(coverImagePath, imgX, 20, { width: imgWidth, height: imgHeight });
    coverUsed = true;
  } catch(e) {}
}

// If no cover image, use Trikara group as fallback
if (!coverUsed && fs.existsSync(trikaraCoverPath)) {
  try {
    const imgHeight = PAGE_HEIGHT - 200;
    const imgWidth = imgHeight;
    const imgX = MARGIN_LEFT + (CONTENT_WIDTH - imgWidth) / 2;
    doc.image(trikaraCoverPath, imgX, 30, { width: imgWidth, height: imgHeight });
    coverUsed = true;
  } catch(e) {}
}

// Title + info overlay on bottom of cover
if (coverUsed) {
  y = PAGE_HEIGHT - MARGIN_BOTTOM - 70;
  // Semi-transparent background for text
  doc.rect(MARGIN_LEFT, y - 8, CONTENT_WIDTH, 80).fillOpacity(0.7).fill('#fff');
  doc.fillOpacity(1);
  doc.font(FONT_BOLD).fontSize(22).fillColor('#1a1a1a');
  doc.text('NUSANTARA ONLINE', MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 25;
  doc.font(FONT_REGULAR).fontSize(12).fillColor('#555');
  doc.text(title, MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 16;
  doc.font(FONT_ITALIC).fontSize(10).fillColor('#888');
  doc.text('Galih Prasetyo', MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
} else {
  // Fallback: text-only cover
  y = PAGE_HEIGHT * 0.2;
  doc.font(FONT_BOLD).fontSize(36).fillColor('#1a1a1a');
  doc.text('NUSANTARA ONLINE', MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 50;
  doc.font(FONT_REGULAR).fontSize(18).fillColor('#555');
  doc.text(title, MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 35;
  doc.font(FONT_ITALIC).fontSize(12).fillColor('#888');
  const babDisplay = filename.replace(/-/g, ' ').replace(/_/g, ' ');
  doc.text(babDisplay, MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 60;
  doc.font(FONT_REGULAR).fontSize(11).fillColor('#999');
  doc.text('Penulis: Galih Prasetyo', MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 20;
  doc.text('Genre: LitRPG / Isekai / Anime Fantasy', MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
}

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
  console.log(`Cover image: ${hasCoverImage ? 'YES' : 'FALLBACK'}`);
});
