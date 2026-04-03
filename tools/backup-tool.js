/**
 * COP AMS — Backup Tool
 * Exports all Supabase tables as a single JSON file for offline safekeeping.
 * Usage (in browser): call BackupTool.downloadBackup(supabaseClient)
 */

const BackupTool = {

  TABLES: ['profiles', 'coa', 'contributions', 'journals', 'bank_reconciliation', 'audit_log'],

  async fetchTable(sb, tableName) {
    const { data, error } = await sb.from(tableName).select('*').order('created_at', { ascending: true });
    if (error) throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
    return data || [];
  },

  async buildBackup(sb) {
    const backup = {
      version: '1.0',
      app: 'COP-AMS',
      organization: 'Church of Pentecost Canada Inc',
      exported_at: new Date().toISOString(),
      tables: {}
    };

    for (const table of this.TABLES) {
      try {
        backup.tables[table] = await this.fetchTable(sb, table);
        console.log(`Backed up ${table}: ${backup.tables[table].length} rows`);
      } catch (err) {
        console.warn(`Could not backup ${table}:`, err.message);
        backup.tables[table] = [];
      }
    }

    backup.summary = Object.fromEntries(
      Object.entries(backup.tables).map(([k, v]) => [k, v.length])
    );
    return backup;
  },

  async downloadBackup(sb) {
    try {
      const backup = await this.buildBackup(sb);
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `cop_ams_backup_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true, summary: backup.summary };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Also cache the full backup to localStorage as emergency offline copy */
  async cacheToLocalStorage(sb) {
    try {
      const backup = await this.buildBackup(sb);
      localStorage.setItem('cop_ams_local_cache', JSON.stringify(backup));
      localStorage.setItem('cop_ams_cache_time', backup.exported_at);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

if (typeof module !== 'undefined') module.exports = BackupTool;
