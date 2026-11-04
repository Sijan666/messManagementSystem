import { Expense } from '../models/expense.model.js';
import PDFDocument from 'pdfkit-table';

// ---------- Theme ----------
const COLORS = {
  primary: '#1e3a8a',
  primaryLight: '#dbeafe',
  border: '#374151',
  text: '#111827',
  muted: '#6b7280',
  zebra: '#f3f4f6',
  white: '#ffffff',
};

const formatBDT = (n) =>
  `BDT ${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

// ---------- Drawing helpers ----------
const drawHeader = (doc, monthLabel) => {
  const { left, right } = {
    left: doc.page.margins.left,
    right: doc.page.width - doc.page.margins.right,
  };
  const width = right - left;

  // Title banner
  doc.rect(left, 40, width, 70).fillAndStroke(COLORS.primary, COLORS.border);

  doc
    .fillColor(COLORS.white)
    .font('Helvetica-Bold')
    .fontSize(24)
    .text('Mess Bazaar & Expense Report', left, 55, {
      width,
      align: 'center',
    });

  doc
    .font('Helvetica')
    .fontSize(12)
    .text(`Month: ${monthLabel}`, left, 86, { width, align: 'center' });

  doc.fillColor(COLORS.text);
  doc.y = 130;
};

const drawSectionTitle = (doc, title) => {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;

  doc.rect(left, y, width, 26).fillAndStroke(COLORS.primaryLight, COLORS.border);
  doc
    .fillColor(COLORS.primary)
    .font('Helvetica-Bold')
    .fontSize(14)
    .text(title, left + 10, y + 6, { width: width - 20 });

  doc.fillColor(COLORS.text);
  doc.y = y + 26 + 10;
  doc.x = left;
};

const drawSummary = (doc, items) => {
  const left = doc.page.margins.left;
  const totalWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const boxWidth = totalWidth / items.length;
  const y = doc.y;
  const height = 55;

  items.forEach((item, i) => {
    const x = left + i * boxWidth;
    doc.rect(x, y, boxWidth, height).lineWidth(1).stroke(COLORS.border);

    doc
      .fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(10)
      .text(item.label, x, y + 10, { width: boxWidth, align: 'center' });

    doc
      .fillColor(COLORS.primary)
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(item.value, x, y + 28, { width: boxWidth, align: 'center' });
  });

  doc.fillColor(COLORS.text);
  doc.y = y + height + 20;
  doc.x = left;
};

// Table with full borders (outer + every row + every column)
const drawTable = async (doc, { headers, rows, columnsSize, fontSize = 11 }) => {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  await doc.table(
    { headers, rows },
    {
      x: left,
      width,
      columnsSize,
      padding: 6,
      divider: {
        header: { disabled: false, width: 1, opacity: 1 },
        horizontal: { disabled: false, width: 0.8, opacity: 1 },
      },
      prepareHeader: () => {
        doc.font('Helvetica-Bold').fontSize(fontSize).fillColor(COLORS.primary);
      },
      prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
        doc.font('Helvetica').fontSize(fontSize).fillColor(COLORS.text);

        // zebra background
        if (indexColumn === 0 && indexRow % 2 === 0) {
          doc.addBackground(rectRow, COLORS.zebra, 1);
        }

        // vertical + outer border for every cell
        const { x, y, width: w, height: h } = rectCell;
        doc
          .lineWidth(0.8)
          .strokeColor(COLORS.border)
          .rect(x, y, w, h)
          .stroke();
      },
    }
  );
  doc.moveDown(1.5);
};

const drawPageNumbers = (doc) => {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.height - 30;
    const left = doc.page.margins.left;
    const width =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc
      .moveTo(left, bottom - 8)
      .lineTo(left + width, bottom - 8)
      .lineWidth(0.8)
      .strokeColor(COLORS.border)
      .stroke();

    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text('System Generated Report - Mess Management Portal', left, bottom, {
        width: width / 2,
        align: 'left',
        lineBreak: false,
      });

    doc
      .font('Helvetica')
      .text(`Page ${i + 1} of ${range.count}`, left + width / 2, bottom, {
        width: width / 2,
        align: 'right',
        lineBreak: false,
      });
  }
};

// ---------- Controller ----------
export const downloadExpenseAndBazaarPDF = async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name')
      .populate('exemptedUsers', 'name')
      .sort({ date: -1 });

    const doc = new PDFDocument({
      margin: 30,
      size: 'A4',
      bufferPages: true,
    });

    const now = new Date();
    const currentMonth = now.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Bazaar_and_Expense_Report.pdf'
    );
    doc.pipe(res);

    // ---- Header ----
    drawHeader(doc, currentMonth);

    // ---- Summary ----
    const bazaarExpenses = expenses.filter((e) => e.category === 'Bazaar');
    const totalAll = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalBazaar = bazaarExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    drawSummary(doc, [
      { label: 'Total Records', value: String(expenses.length) },
      { label: 'Bazaar Items', value: String(bazaarExpenses.length) },
      { label: 'Bazaar Total', value: formatBDT(totalBazaar) },
      { label: 'Grand Total', value: formatBDT(totalAll) },
    ]);

    // ---- 1. Bazaar Checklist ----
    drawSectionTitle(doc, '1. Bazaar Shopping Checklist');

    if (bazaarExpenses.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(12)
        .text('No bazaar items recorded yet.');
      doc.moveDown(1.5);
    } else {
      const bazaarRows = bazaarExpenses.map((item, i) => [
        String(i + 1),
        formatDate(item.date),
        item.description || 'Bazaar',
        item.quantity || '—',
        formatBDT(item.amount),
      ]);

      // total row
      bazaarRows.push(['', '', 'TOTAL', '', formatBDT(totalBazaar)]);

      await drawTable(doc, {
        headers: ['#', 'Date', 'Item Description', 'Quantity', 'Amount'],
        rows: bazaarRows,
        columnsSize: [35, 85, 190, 90, 135],
        fontSize: 11,
      });
    }

    // ---- 2. All Expenses ----
    drawSectionTitle(doc, '2. All Expense Records');

    const allExpenseRows = expenses.map((item, i) => {
      const assignedName =
        item.category === 'Personal' && item.assignedTo
          ? item.assignedTo.name
          : '—';
      const exemptedNames =
        item.exemptedUsers && item.exemptedUsers.length > 0
          ? item.exemptedUsers.map((u) => u.name).join(', ')
          : '—';

      return [
        String(i + 1),
        formatDate(item.date),
        item.category || '—',
        item.description || '—',
        item.quantity || '—',
        formatBDT(item.amount),
        assignedName,
        exemptedNames,
      ];
    });

    allExpenseRows.push(['', '', '', 'GRAND TOTAL', '', formatBDT(totalAll), '', '']);

    await drawTable(doc, {
      headers: ['#', 'Date', 'Category', 'Description', 'Qty', 'Amount', 'Assigned', 'Exempted'],
      rows: allExpenseRows,
      columnsSize: [28, 62, 58, 95, 35, 85, 65, 65],
      fontSize: 10,
    });

    // ---- Footer / page numbers on every page ----
    drawPageNumbers(doc);

    doc.end();
  } catch (error) {
    console.error('PDF Generation Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to generate PDF',
      });
    }
  }
};