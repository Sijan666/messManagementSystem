import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit-table';
import { Expense } from '../models/expense.model.js';

/* ============================================================
 * Config
 * ============================================================ */
const FONT_DIR = path.join(process.cwd(), 'src', 'fonts');
const FONT_FILES = {
  regular: 'Kalpurush.ttf',
  bold: 'NotoSansBengali-Bold.ttf',
};

const PAGE = { size: 'A4', margin: 30 };

const COLORS = {
  primary: '#1e3a8a',
  primaryLight: '#dbeafe',
  border: '#374151',
  text: '#111827',
  muted: '#374151',
  zebra: '#f3f4f6',
  white: '#ffffff',
  subtotalBg: '#fde68a',
  subtotalText: '#78350f',
};

const ROW_STYLES = {
  subtotal: { bg: COLORS.subtotalBg, text: COLORS.subtotalText },
  grandTotal: { bg: COLORS.primary, text: COLORS.white },
};

// Column header + relative width
const COLUMNS = [
  { header: '#', weight: 28 },
  { header: 'Date', weight: 78 },
  { header: 'Category', weight: 60 },
  { header: 'Description', weight: 90 },
  { header: 'Qty', weight: 38 },
  { header: 'Amount', weight: 90 },
  { header: 'Assigned', weight: 75 },
  { header: 'Exempted', weight: 76 },
];

/* Formatters */
const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

const formatBDT = (n) => `BDT ${numberFormatter.format(Number(n) || 0)}`;
const formatDate = (d) => dateFormatter.format(new Date(d));

/* Fonts */
let fontCache = null;

const loadFonts = () => {
  if (fontCache) return fontCache;

  const regularPath = path.join(FONT_DIR, FONT_FILES.regular);
  if (!fs.existsSync(regularPath)) {
    throw new Error(`Font file missing at: ${regularPath}. Please place ${FONT_FILES.regular} in that folder.`);
  }

  const regular = fs.readFileSync(regularPath);
  const boldPath = path.join(FONT_DIR, FONT_FILES.bold);
  let bold = regular;

  if (fs.existsSync(boldPath)) {
    bold = fs.readFileSync(boldPath);
  } else {
    console.warn(`Bold Bangla font not found at -> ${boldPath}`);
  }

  fontCache = { regular, bold };
  return fontCache;
};

/* Report data */
const sumAmount = (items) => items.reduce((sum, e) => sum + (e.amount || 0), 0);

// category
const compareCategories = (a, b) => {
  if (a === 'Bazaar') return -1;
  if (b === 'Bazaar') return 1;
  return a.localeCompare(b);
};

const toRow = (serial, category, item) => [
  String(serial),
  formatDate(item.date),
  category,
  item.description || '—',
  item.quantity || '—',
  formatBDT(item.amount),
  category === 'Personal' && item.assignedTo ? item.assignedTo.name : '—',
  item.exemptedUsers?.length ? item.exemptedUsers.map((u) => u.name).join(', ') : '—',
];

const buildReport = (expenses) => {
  const groups = new Map();
  for (const item of expenses) {
    const category = item.category || 'Other';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }

  const rows = [];
  const rowStyles = {};
  let serial = 1;

  for (const category of [...groups.keys()].sort(compareCategories)) {
    const items = groups.get(category);

    for (const item of items) rows.push(toRow(serial++, category, item));

    rowStyles[rows.length] = ROW_STYLES.subtotal;
    rows.push(['', '', category, 'Subtotal', '', formatBDT(sumAmount(items)), '', '']);
  }

  const grandTotal = sumAmount(expenses);
  rowStyles[rows.length] = ROW_STYLES.grandTotal;
  rows.push(['', '', '', 'GRAND TOTAL', '', formatBDT(grandTotal), '', '']);

  const bazaar = groups.get('Bazaar') || [];

  return {
    rows,
    rowStyles,
    stats: {
      totalRecords: expenses.length,
      bazaarCount: bazaar.length,
      bazaarTotal: sumAmount(bazaar),
      grandTotal,
    },
  };
};

/* PDF drawing helpers */
const getBox = (doc) => ({
  left: doc.page.margins.left,
  width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
});

const drawHeader = (doc, monthLabel) => {
  const { left, width } = getBox(doc);

  doc.rect(left, 40, width, 70).fillAndStroke(COLORS.primary, COLORS.border);

  doc
    .fillColor(COLORS.white)
    .font('Helvetica-Bold')
    .fontSize(24)
    .text('Mess Bazaar & Expense Report', left, 55, { width, align: 'center' });

  doc.fontSize(12).text(`Month: ${monthLabel}`, left, 86, { width, align: 'center' });

  doc.fillColor(COLORS.text);
  doc.y = 130;
};

const drawSectionTitle = (doc, title) => {
  if (doc.y > doc.page.height - doc.page.margins.bottom - 50) doc.addPage();

  const { left, width } = getBox(doc);
  const y = doc.y;

  doc.rect(left, y, width, 26).fillAndStroke(COLORS.primaryLight, COLORS.border);
  doc
    .fillColor(COLORS.primary)
    .font('Helvetica-Bold')
    .fontSize(14)
    .text(title, left + 10, y + 6, { width: width - 20 });

  doc.fillColor(COLORS.text);
  doc.y = y + 36;
  doc.x = left;
};

const drawSummary = (doc, items) => {
  const { left, width } = getBox(doc);
  const boxWidth = width / items.length;
  const height = 55;
  const y = doc.y;

  items.forEach((item, i) => {
    const x = left + i * boxWidth;

    doc.rect(x, y, boxWidth, height).lineWidth(1).stroke(COLORS.border);

    doc
      .fillColor(COLORS.muted)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(item.label, x, y + 10, { width: boxWidth, align: 'center' });

    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .text(item.value, x, y + 28, { width: boxWidth, align: 'center' });
  });

  doc.fillColor(COLORS.text);
  doc.y = y + height + 20;
  doc.x = left;
};

const drawTable = async (doc, { rows, rowStyles, fontSize = 10 }) => {
  const { left, width } = getBox(doc);
  const totalWeight = COLUMNS.reduce((sum, c) => sum + c.weight, 0);
  const columnsSize = COLUMNS.map((c) => (c.weight / totalWeight) * width);

  doc.font('BanglaBold');

  await doc.table(
    { headers: COLUMNS.map((c) => c.header), rows },
    {
      x: left,
      width,
      columnsSize,
      padding: 6,
      divider: {
        header: { disabled: true },
        horizontal: { disabled: true },
      },
      prepareHeader: () => {
        doc.font('BanglaBold').fontSize(fontSize).fillColor(COLORS.primary);
      },
      prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
        const style = rowStyles[indexRow];

        doc
          .font('BanglaBold')
          .fontSize(fontSize)
          .fillColor(style ? style.text : COLORS.text);

        if (indexColumn === 0) {
          if (style) doc.addBackground(rectRow, style.bg, 1);
          else if (indexRow % 2 === 0) doc.addBackground(rectRow, COLORS.zebra, 1);
        }

        const { x, y, width: w, height: h } = rectCell;
        doc.lineWidth(0.8).strokeColor(COLORS.border).rect(x, y, w, h).stroke();
      },
    }
  );

  doc.moveDown(1.5);
};


const drawPageNumbers = (doc) => {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const { left, width } = getBox(doc);
    const bottom = doc.page.height - 30;

    doc
      .moveTo(left, bottom - 8)
      .lineTo(left + width, bottom - 8)
      .lineWidth(0.8)
      .strokeColor(COLORS.border)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text('System Generated Report - Mess Management Portal', left, bottom, {
        width: width / 2,
        align: 'left',
        lineBreak: false,
      })
      .text(`Page ${i + 1} of ${range.count}`, left + width / 2, bottom, {
        width: width / 2,
        align: 'right',
        lineBreak: false,
      });

    doc.page.margins.bottom = originalBottomMargin;
  }
};

/* PDF renderer */
const renderPdf = async ({ rows, rowStyles, stats }, fonts, monthLabel) => {
  const doc = new PDFDocument({ margin: PAGE.margin, size: PAGE.size, bufferPages: true });

  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.registerFont('Bangla', fonts.regular);
  doc.registerFont('BanglaBold', fonts.bold);

  drawHeader(doc, monthLabel);

  drawSummary(doc, [
    { label: 'Total Records', value: String(stats.totalRecords) },
    { label: 'Bazaar Items', value: String(stats.bazaarCount) },
    { label: 'Bazaar Total', value: formatBDT(stats.bazaarTotal) },
    { label: 'Grand Total', value: formatBDT(stats.grandTotal) },
  ]);

  drawSectionTitle(doc, 'Expense & Bazaar List');

  if (stats.totalRecords === 0) {
    doc.font('Helvetica-Bold').fontSize(12).text('No expense records found.');
  } else {
    await drawTable(doc, { rows, rowStyles });
  }

  drawPageNumbers(doc);
  doc.end();

  return finished;
};

/* Controller */
export const downloadExpenseAndBazaarPDF = async (req, res) => {
  try {
    const fonts = loadFonts();

    const expenses = await Expense.find()
      .select('date category description quantity amount assignedTo exemptedUsers')
      .populate('assignedTo', 'name')
      .populate('exemptedUsers', 'name')
      .sort({ date: -1 })
      .lean();

    const now = new Date();
    const pdf = await renderPdf(buildReport(expenses), fonts, monthFormatter.format(now));

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Bazaar_and_Expense_Report_${now.toISOString().slice(0, 7)}.pdf"`,
      'Content-Length': pdf.length,
      'Cache-Control': 'no-store',
    });
    res.end(pdf);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate PDF',
    });
  }
};