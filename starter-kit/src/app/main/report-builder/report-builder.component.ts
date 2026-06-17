import { Component, OnInit } from '@angular/core';
import { ReportBuilderService, ReportSource, SavedReport } from './report-builder.service';

@Component({
  selector: 'app-report-builder',
  templateUrl: './report-builder.component.html',
  styleUrls: ['./report-builder.component.scss']
})
export class ReportBuilderComponent implements OnInit {
  sources: ReportSource[] = [];
  savedReports: SavedReport[] = [];
  rows: any[] = [];
  columns: string[] = [];
  message = '';
  error = '';
  loading = false;
  saving = false;

  model = {
    reportName: '',
    sourceKey: '',
    columns: [] as string[],
    fromDate: '',
    toDate: '',
    search: '',
    take: 100,
    scheduleFrequency: '',
    emailTo: ''
  };

  readonly schedules = ['', 'Daily', 'Weekly', 'Monthly'];

  constructor(private reportService: ReportBuilderService) {}

  ngOnInit(): void {
    this.loadSources();
    this.loadSavedReports();
  }

  loadSources(): void {
    this.reportService.getSources().subscribe({
      next: rows => {
        this.sources = rows;
        if (rows.length && !this.model.sourceKey) {
          this.model.sourceKey = rows[0].key;
          this.model.columns = rows[0].columns.slice(0, 5);
        }
      },
      error: () => (this.error = 'Report sources load panna mudiyala.')
    });
  }

  loadSavedReports(): void {
    this.reportService.getSavedReports().subscribe({
      next: rows => (this.savedReports = rows),
      error: () => (this.savedReports = [])
    });
  }

  get selectedSource(): ReportSource | undefined {
    return this.sources.find(s => s.key === this.model.sourceKey);
  }

  sourceChanged(): void {
    this.model.columns = this.selectedSource?.columns.slice(0, 5) || [];
    this.rows = [];
    this.columns = [];
  }

  toggleColumn(column: string, checked: boolean): void {
    this.model.columns = checked
      ? Array.from(new Set([...this.model.columns, column]))
      : this.model.columns.filter(c => c !== column);
  }

  run(): void {
    this.error = '';
    this.message = '';
    if (!this.model.sourceKey || this.model.columns.length === 0) {
      this.error = 'Source and columns required.';
      return;
    }

    this.loading = true;
    this.reportService.runReport(this.buildPayload()).subscribe({
      next: rows => {
        this.rows = rows || [];
        this.columns = this.model.columns;
        this.loading = false;
      },
      error: () => {
        this.error = 'Report run panna mudiyala.';
        this.loading = false;
      }
    });
  }

  save(): void {
    this.error = '';
    this.message = '';
    if (!this.model.reportName) {
      this.error = 'Report name required.';
      return;
    }

    this.saving = true;
    this.reportService.saveReport(this.buildPayload(true)).subscribe({
      next: () => {
        this.message = 'Report save aagiduchu.';
        this.saving = false;
        this.loadSavedReports();
      },
      error: () => {
        this.error = 'Report save panna mudiyala.';
        this.saving = false;
      }
    });
  }

  openSaved(report: SavedReport): void {
    this.model.reportName = report.reportName;
    this.model.sourceKey = report.sourceKey;
    this.model.columns = this.safeParse(report.columnsJson, []);
    const filters = this.safeParse(report.filtersJson, {});
    this.model.fromDate = filters.fromDate || '';
    this.model.toDate = filters.toDate || '';
    this.model.search = filters.search || '';
    this.model.scheduleFrequency = report.scheduleFrequency || '';
    this.model.emailTo = report.emailTo || '';
    this.run();
  }

  exportCsv(): void {
    if (!this.rows.length) {
      return;
    }
    const header = this.columns.join(',');
    const lines = this.rows.map(row => this.columns.map(c => this.csvValue(row[c])).join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.model.reportName || this.model.sourceKey || 'report'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  trackById(_: number, item: any): number {
    return item.id;
  }

  private buildPayload(includeSaveFields = false): any {
    const payload: any = {
      sourceKey: this.model.sourceKey,
      columns: this.model.columns,
      filters: {
        fromDate: this.model.fromDate || null,
        toDate: this.model.toDate || null,
        search: this.model.search || null
      },
      take: this.model.take
    };

    if (includeSaveFields) {
      payload.reportName = this.model.reportName;
      payload.scheduleFrequency = this.model.scheduleFrequency || null;
      payload.emailTo = this.model.emailTo || null;
      payload.isActive = true;
    }

    return payload;
  }

  private csvValue(value: any): string {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  private safeParse(value: string, fallback: any): any {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }
}
