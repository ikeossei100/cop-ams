/**
 * COP AMS — Restore Tool
 * Validates and imports a backup JSON file back into Supabase.
 * Usage (in browser): call RestoreTool.restoreFromFile(supabaseClient, fileInput)
 */

const RestoreTool = {

  REQUIRED_TABLES: ['coa', 'contributions', 'journals'],
  RESTORE_ORDER: ['coa', 'profiles', 'contributions', 'journals', 'bank_reconciliation', 'audit_log'],

  /** Read and parse backup JSON from a file input element */
  readFile(fileInput) {
    return new Promise((resolve, reject) => {
      const file = fileInput.files[0];
      if (!file) return reject(new Error('No file selected.'));
      if (!file.name.endsWith('.json')) return reject(new Error('File must be a .json backup file.'));
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          resolve(data);
        } catch {
          reject(new Error('Invalid JSON — file may be corrupted.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file);
    });
  },

  /** Validate the backup structure */
  validate(backup) {
    const errors = [];
    if (!backup.version) errors.push('Missing version field.');
    if (backup.app !== 'COP-AMS') errors.push('This backup is not from COP-AMS.');
    if (!backup.tables) errors.push('Missing tables section.');
    for (const t of this.REQUIRED_TABLES) {
      if (!backup.tables[t]) errors.push(`Missing required table: ${t}`);
    }
    return { valid: errors.length === 0, errors };
  },

  /** Upsert a single table into Supabase */
  async restoreTable(sb, tableName, rows) {
    if (!rows || rows.length === 0) return { table: tableName, count: 0 };
    const { error } = await sb.from(tableName).upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(`Failed to restore ${tableName}: ${error.message}`);
    return { table: tableName, count: rows.length };
  },

  /** Full restore from file input */
  async restoreFromFile(sb, fileInput, onProgress) {
    const backup = await this.readFile(fileInput);
    const validation = this.validate(backup);
    if (!validation.valid) return { success: false, errors: validation.errors };

    const results = [];
    for (const table of this.RESTORE_ORDER) {
      const rows = backup.tables[table];
      if (!rows) continue;
      try {
        const result = await this.restoreTable(sb, table, rows);
        results.push(result);
        if (onProgress) onProgress(table, result.count);
      } catch (err) {
        return { success: false, errors: [err.message], results };
      }
    }

    return {
      success: true,
      backup_date: backup.exported_at,
      results,
      total_rows: results.reduce((s, r) => s + r.count, 0)
    };
  },

  /** Restore from localStorage cache (offline fallback) */
  restoreFromCache() {
    const raw = localStorage.getItem('cop_ams_local_cache');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
};

if (typeof module !== 'undefined') module.exports = RestoreTool;
