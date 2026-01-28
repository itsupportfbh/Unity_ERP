import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChartofaccountService } from '../../chartofaccount/chartofaccount.service';
import { JournalService } from '../journalservice/journal.service';
import Swal from 'sweetalert2';

interface JournalLineVm {
  ledgerId: number | null;        // ChartOfAccount Id
  lineDescription: string;
  debit: number | null;
  credit: number | null;
}

@Component({
  selector: 'app-create-journal',
  templateUrl: './create-journal.component.html',
  styleUrls: ['./create-journal.component.scss']
})
export class CreateJournalComponent implements OnInit {

  // Header
  journalDate: string | null = null;
  description: string = '';
  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Lookups
  parentHeadList: any[] = [];   // ledger dropdown (Chart of Account)

  // Lines
  lines: JournalLineVm[] = [];
  addHover = false;

  // Recurring
  isRecurring = false;
  recurringFrequency: string | null = null;
  recurringInterval: number = 1;
  recurringStartDate: string | null = null;
  recurringEndType: 'NoEnd' | 'EndByDate' | 'EndByCount' = 'NoEnd';
  recurringEndDate: string | null = null;
  recurringCount?: number;

  // State
  isSaving = false;

  constructor(
    private router: Router,
    private _chart: ChartofaccountService,
    private _journal: JournalService
  ) {}

  ngOnInit(): void {
    this.loadAccountHeads();

    // start with two lines like prototype
    this.lines = [
      this.createEmptyLine(),
      this.createEmptyLine()
    ];
  }

  // ---------- Helpers ----------

  createEmptyLine(): JournalLineVm {
    return {
      ledgerId: null,
      // when creating new line, copy current header description
      lineDescription: this.description || '',
      debit: null,
      credit: null
    };
  }

  get totalDebit(): number {
    return this.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  }

  get totalCredit(): number {
    return this.lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  }

  get isBalanced(): boolean {
    // only balanced when debits = credits and > 0
    return this.totalDebit === this.totalCredit && this.totalDebit > 0;
  }

  get hasValidLines(): boolean {
    // at least one line with ledger + non-zero amount
    return this.lines.some(l =>
      l.ledgerId &&
      ((l.debit || 0) !== 0 || (l.credit || 0) !== 0)
    );
  }

  // when user types debit, clear credit
  onDebitChanged(line: JournalLineVm): void {
    if (line.debit && line.debit !== 0) {
      line.credit = null;
    }
  }

  // when user types credit, clear debit
  onCreditChanged(line: JournalLineVm): void {
    if (line.credit && line.credit !== 0) {
      line.debit = null;
    }
  }

  // Header description changed – keep ALL line descriptions in sync
  onHeaderDescriptionChange(value: string): void {
    this.description = value;
    this.lines.forEach(l => {
      l.lineDescription = value;
    });
  }

  // ---------- Loaders ----------

  loadAccountHeads(): void {
    this._chart.getAllChartOfAccount().subscribe((res: any) => {
      const data = (res?.data || []).filter((x: any) => x.isActive === true);
      this.parentHeadList = data.map((head: any) => ({
        value: Number(head.id),
        label: this.buildFullPath(head, data)
      }));
    });
  }

  private buildFullPath(item: any, all: any[]): string {
    let path = item.headName;
    let current = all.find((x: any) => x.headCode === item.parentHead);
    while (current) {
      path = `${current.headName} >> ${path}`;
      current = all.find((x: any) => x.headCode === current.parentHead);
    }
    return path;
  }

  // ---------- Line actions ----------

  addLine(): void {
    this.lines.push(this.createEmptyLine());
  }

  removeLine(index: number): void {
    if (this.lines.length === 1) { return; }
    this.lines.splice(index, 1);
  }

  // ---------- Submit / Cancel ----------

  onSubmit(): void {
    // Basic validations
    if (!this.journalDate) {
      Swal.fire('Required', 'Journal Date is required.', 'warning');
      return;
    }

    if (!this.hasValidLines) {
      Swal.fire('Required', 'Enter at least one journal line.', 'warning');
      return;
    }

    if (!this.isBalanced) {
      Swal.fire('Not balanced', 'Total debit and credit must be equal.', 'warning');
      return;
    }

    const startDate = this.isRecurring
      ? (this.recurringStartDate || this.journalDate)
      : null;

    // Build line payloads
    const linePayloads = this.lines
      .filter(l => l.ledgerId && ((l.debit || 0) !== 0 || (l.credit || 0) !== 0))
      .map(l => ({
        accountId: l.ledgerId,
        budgetLineId: l.ledgerId,    // for GL tree
        description: l.lineDescription,
        itemId: null,                // no item
        type: null,                  // no customer/supplier type now
        customerId: null,
        supplierId: null,
        debit: l.debit || 0,
        credit: l.credit || 0
      }));

    const payload = {
      // Header
      journalDate: this.journalDate,
      description: this.description,

      // Recurring
      isRecurring: this.isRecurring,
      recurringFrequency: this.recurringFrequency,
      recurringInterval: this.recurringInterval,
      recurringStartDate: startDate,
      recurringEndType: this.isRecurring ? this.recurringEndType : null,
      recurringEndDate: this.recurringEndType === 'EndByDate' ? this.recurringEndDate : null,
      recurringCount: this.recurringEndType === 'EndByCount' ? this.recurringCount : null,

      timezone: this.timezone,
      createdBy: 1,   // TODO: from logged-in user

      lines: linePayloads
    };

    this.isSaving = true;

    this._journal.create(payload).subscribe({
      next: () => {
        this.isSaving = false;
        Swal.fire('Success', 'Journal saved successfully', 'success')
          .then(() => this.router.navigate(['financial/journal']));
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Journal create error', err);
        if (err.error && err.error.message) {
          Swal.fire('Error', err.error.message, 'error');
        } else {
          Swal.fire('Error', 'Error saving journal', 'error');
        }
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['financial/journal']);
  }
}
