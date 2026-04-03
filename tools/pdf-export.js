/**
 * COP AMS — PDF Export Tool
 * Wraps jsPDF + AutoTable to produce branded reports with COP letterhead.
 * Requires jsPDF and jspdf-autotable to be loaded via CDN before calling.
 */

const PDFExport = {

  ORG_NAME: 'Church of Pentecost Canada Inc',
  ADDRESS: 'Head Office — General Fund',
  BRAND_COLOR: [200, 16, 46],   // #C8102E COP red
  GOLD_COLOR:  [180, 140, 0],   // darker gold for print

  /** Create a new jsPDF doc with COP letterhead */
  createDoc(title, subtitle, dateRange) {
    const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Red header bar
    doc.setFillColor(...this.BRAND_COLOR);
    doc.rect(0, 0, 210, 22, 'F');

    // Org name
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(this.ORG_NAME, 14, 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(this.ADDRESS, 14, 16);

    // Report title
    doc.setTextColor(...this.BRAND_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title, 14, 32);

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(subtitle, 14, 39);
    }

    if (dateRange) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Period: ${dateRange}`, 14, subtitle ? 45 : 39);
    }

    // Print date (top right)
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Printed: ${new Date().toLocaleString('en-CA')}`, 196, 10, { align: 'right' });

    return doc;
  },

  /** Add a table to a doc using AutoTable */
  addTable(doc, headers, rows, startY, options = {}) {
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: startY || 52,
      theme: 'striped',
      headStyles: {
        fillColor: this.BRAND_COLOR,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [248, 247, 244] },
      columnStyles: options.columnStyles || {},
      margin: { left: 14, right: 14 },
      ...options
    });
    return doc.lastAutoTable.finalY;
  },

  /** Add a totals row below the table */
  addTotalsRow(doc, label, amount, y) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...this.BRAND_COLOR);
    doc.text(label, 14, y + 6);
    doc.text(amount, 196, y + 6, { align: 'right' });
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
  },

  /** Add page numbers to all pages */
  addPageNumbers(doc) {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${total}`, 196, 290, { align: 'right' });
    }
  },

  /** Export Income Statement PDF */
  exportIncomeStatement(data, dateRange) {
    const doc = this.createDoc('Income Statement', null, dateRange);
    const headers = ['Account Code', 'Account Name', 'Amount (CAD)'];

    // Income section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...this.BRAND_COLOR);
    doc.text('INCOME', 14, 54);

    const incomeRows = data.income.map(r => [r.code, r.name, r.amount.toFixed(2)]);
    let y = this.addTable(doc, headers, incomeRows, 58, {
      columnStyles: { 2: { halign: 'right' } }
    });
    this.addTotalsRow(doc, 'Total Income', data.totalIncome.toFixed(2), y);
    y += 14;

    // Expense section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...this.BRAND_COLOR);
    doc.text('EXPENDITURE', 14, y);

    const expRows = data.expenses.map(r => [r.code, r.name, r.amount.toFixed(2)]);
    y = this.addTable(doc, headers, expRows, y + 4, {
      columnStyles: { 2: { halign: 'right' } }
    });
    this.addTotalsRow(doc, 'Total Expenditure', data.totalExpense.toFixed(2), y);
    y += 14;
    this.addTotalsRow(doc, 'NET SURPLUS / (DEFICIT)', data.net.toFixed(2), y);

    this.addPageNumbers(doc);
    doc.save(`Income_Statement_${dateRange?.replace(/[^0-9-]/g, '_') || 'report'}.pdf`);
  },

  /** Export Trial Balance PDF */
  exportTrialBalance(data, dateRange) {
    const doc = this.createDoc('Trial Balance', null, dateRange);
    const headers = ['Code', 'Account Name', 'Debit (CAD)', 'Credit (CAD)'];
    const rows = data.accounts.map(r => [r.code, r.name, r.debit > 0 ? r.debit.toFixed(2) : '', r.credit > 0 ? r.credit.toFixed(2) : '']);
    let y = this.addTable(doc, headers, rows, 52, {
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } }
    });
    this.addTotalsRow(doc, `TOTALS    Debit: ${data.totalDebit.toFixed(2)}`, `Credit: ${data.totalCredit.toFixed(2)}`, y);
    this.addPageNumbers(doc);
    doc.save(`Trial_Balance_${dateRange?.replace(/[^0-9-]/g, '_') || 'report'}.pdf`);
  },

  /** Generic table export */
  exportGenericReport(title, headers, rows, dateRange) {
    const doc = this.createDoc(title, null, dateRange);
    this.addTable(doc, headers, rows, 52);
    this.addPageNumbers(doc);
    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  }
};

if (typeof module !== 'undefined') module.exports = PDFExport;
