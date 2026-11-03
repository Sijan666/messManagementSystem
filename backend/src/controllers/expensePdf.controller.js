import { Expense } from '../models/expense.model.js';
import PDFDocument from 'pdfkit';

export const downloadExpenseAndBazaarPDF = async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name')
      .populate('exemptedUsers', 'name')
      .sort({ date: -1 });

    const doc = new PDFDocument({ margin: 50 });
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Bazaar_and_Expense_Report.pdf`);
    
    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Mess Bazaar & Expense Report', { align: 'center' });
    doc.fontSize(12).text(`Month: ${currentMonth}`, { align: 'center' });
    doc.moveDown(1.5);

    // 1. Bazaar Shopping Checklist Section
    doc.fontSize(14).text('Bazaar Shopping Checklist', { underline: true });
    doc.moveDown(0.5);

    const bazaarExpenses = expenses.filter(e => e.category === 'Bazaar');
    
    if (bazaarExpenses.length === 0) {
      doc.fontSize(10).text('No bazaar items recorded yet.');
    } else {
      bazaarExpenses.forEach((item, index) => {
        const dateStr = new Date(item.date).toLocaleDateString();
        doc.fontSize(10).text(`[   ] ${index + 1}. Date: ${dateStr} | Item/Desc: ${item.description || 'Bazaar'} | Amount: ৳${item.amount.toFixed(2)}`);
      });
    }
    doc.moveDown(1.5);

    // 2. All Expenses Detailed Section
    doc.fontSize(14).text('All Expense Records', { underline: true });
    doc.moveDown(0.5);

    expenses.forEach((item, index) => {
      const dateStr = new Date(item.date).toLocaleDateString();
      doc.fontSize(10).text(`${index + 1}. [${item.category}] Amount: ৳${item.amount.toFixed(2)} | Date: ${dateStr}`);
      if (item.description) {
        doc.text(`   Desc: ${item.description}`);
      }
      if (item.category === 'Personal' && item.assignedTo) {
        doc.text(`   Assigned To: ${item.assignedTo.name}`);
      }
      if (item.exemptedUsers && item.exemptedUsers.length > 0) {
        const names = item.exemptedUsers.map(u => u.name).join(', ');
        doc.text(`   Exempted: ${names}`);
      }
      doc.moveDown(0.4);
    });

    doc.end();
  } catch (error) {
    console.error('PDF Generation Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ status: 'error', message: error.message || 'Failed to generate PDF' });
    }
  }
};