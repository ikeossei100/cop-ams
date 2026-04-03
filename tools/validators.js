/**
 * COP AMS — Shared Validation Utilities
 * Used by the SPA for client-side validation before any Supabase call.
 */

const Validators = {

  /** Validate a journal entry: lines must balance, all accounts must be active Detail */
  validateJournal(journal, coaMap) {
    const errors = [];
    if (!journal.date) errors.push('Journal date is required.');
    if (!journal.description?.trim()) errors.push('Journal description is required.');
    if (!journal.lines || journal.lines.length < 2) errors.push('At least two journal lines are required.');

    let totalDebit = 0, totalCredit = 0;
    (journal.lines || []).forEach((line, i) => {
      if (!line.account_code) errors.push(`Line ${i + 1}: account code is required.`);
      if (!line.dc || !['DB', 'CR'].includes(line.dc)) errors.push(`Line ${i + 1}: DC must be DB or CR.`);
      const amt = parseFloat(line.amount);
      if (isNaN(amt) || amt <= 0) errors.push(`Line ${i + 1}: amount must be greater than zero.`);
      if (line.dc === 'DB') totalDebit += amt || 0;
      if (line.dc === 'CR') totalCredit += amt || 0;

      if (coaMap && line.account_code) {
        const acct = coaMap[line.account_code];
        if (!acct) errors.push(`Line ${i + 1}: account code "${line.account_code}" not found.`);
        else if (acct.type !== 'Detail') errors.push(`Line ${i + 1}: account must be a Detail-type account.`);
        else if (!acct.active) errors.push(`Line ${i + 1}: account "${line.account_code}" is inactive.`);
      }
    });

    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.005) errors.push(`Debits (${totalDebit.toFixed(2)}) must equal Credits (${totalCredit.toFixed(2)}). Difference: ${diff.toFixed(2)}.`);

    return { valid: errors.length === 0, errors, totalDebit, totalCredit };
  },

  /** Validate a contribution record */
  validateContribution(contrib, coaMap) {
    const errors = [];
    if (!contrib.date) errors.push('Contribution date is required.');
    const amt = parseFloat(contrib.amount);
    if (isNaN(amt) || amt <= 0) errors.push('Amount must be greater than zero.');
    if (!contrib.account_code) errors.push('Account code is required.');

    if (coaMap && contrib.account_code) {
      const acct = coaMap[contrib.account_code];
      if (!acct) errors.push(`Account code "${contrib.account_code}" not found.`);
      else if (acct.type !== 'Detail') errors.push('Account must be a Detail-type account.');
      else if (!acct.active) errors.push(`Account "${contrib.account_code}" is inactive.`);
    }
    return { valid: errors.length === 0, errors };
  },

  /** Validate a new COA account */
  validateAccount(account, existingCodes) {
    const errors = [];
    if (!account.code?.trim()) errors.push('Account code is required.');
    if (!account.name?.trim()) errors.push('Account name is required.');
    if (!account.type || !['Group', 'Detail'].includes(account.type)) errors.push('Type must be Group or Detail.');
    if (!account.dc || !['DB', 'CR'].includes(account.dc)) errors.push('DC must be DB or CR.');
    if (!account.category) errors.push('Category is required.');

    if (account.code && existingCodes && existingCodes.has(account.code.trim())) {
      errors.push(`Account code "${account.code}" already exists.`);
    }
    return { valid: errors.length === 0, errors };
  },

  /** Sanitize a string: trim, no HTML tags */
  sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/<[^>]*>/g, '');
  },

  /** Format a number as currency (CAD) */
  currency(amount) {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount || 0);
  },

  /** Parse a locale currency string back to a number */
  parseCurrency(str) {
    if (typeof str === 'number') return str;
    return parseFloat(String(str).replace(/[^0-9.\-]/g, '')) || 0;
  },

  /** Check if a date string is a valid ISO date */
  isValidDate(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  },

  /** Return today's date as YYYY-MM-DD */
  today() {
    return new Date().toISOString().split('T')[0];
  }
};

if (typeof module !== 'undefined') module.exports = Validators;
