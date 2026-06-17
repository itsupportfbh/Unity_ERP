import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { AccountsPayableService } from '../accounts-payable/accounts-payable.service';
import { BankReconciliationService, BankStatementLine } from './bank-reconciliation.service';

@Component({
  selector: 'app-bank-reconciliation',
  templateUrl: './bank-reconciliation.component.html',
  styleUrls: ['./bank-reconciliation.component.scss']
})
export class BankReconciliationComponent implements OnInit {
  bankAccounts: any[] = [];
  selectedBankId: number | null = null;
  matchedFilter: boolean | undefined = undefined;
  lines: BankStatementLine[] = [];
  summary: any = null;
  isLoading = false;
  importText = '';

  constructor(
    private apService: AccountsPayableService,
    private reconciliationService: BankReconciliationService
  ) {}

  ngOnInit(): void {
    this.loadBanks();
  }

  loadBanks(): void {
    this.apService.getBankAccounts().subscribe({
      next: (res: any) => this.bankAccounts = res?.data || res || [],
      error: (err) => Swal.fire('Error', this.getErrorMessage(err, 'Failed to load bank accounts.'), 'error')
    });
  }

  loadLines(): void {
    if (!this.selectedBankId) return;
    this.isLoading = true;
    this.reconciliationService.lines(this.selectedBankId, this.matchedFilter).subscribe({
      next: (res) => {
        this.lines = res?.data || [];
        this.isLoading = false;
        this.loadSummary();
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire('Error', this.getErrorMessage(err, 'Failed to load statement lines.'), 'error');
      }
    });
  }

  loadSummary(): void {
    if (!this.selectedBankId) return;
    this.reconciliationService.summary(this.selectedBankId).subscribe({
      next: (res) => this.summary = res?.data || null
    });
  }

  importStatement(): void {
    if (!this.selectedBankId) {
      Swal.fire('Validation', 'Select bank account.', 'warning');
      return;
    }

    const lines = this.parseImportText();
    if (!lines.length) {
      Swal.fire('Validation', 'Paste CSV lines: date,description,reference,debit,credit', 'warning');
      return;
    }

    this.reconciliationService.importStatement({ bankId: this.selectedBankId, lines }).subscribe({
      next: () => {
        Swal.fire('Imported', 'Bank statement imported successfully.', 'success');
        this.importText = '';
        this.loadLines();
      },
      error: (err) => Swal.fire('Error', this.getErrorMessage(err, 'Import failed.'), 'error')
    });
  }

  reconcile(row: BankStatementLine): void {
    Swal.fire({
      title: 'Reconcile line',
      html: `
        <input id="docType" class="swal2-input" placeholder="Document Type (AR_RECEIPT/AP_PAYMENT)">
        <input id="docId" type="number" class="swal2-input" placeholder="Document Id">
        <input id="docNo" class="swal2-input" placeholder="Document No">
      `,
      showCancelButton: true,
      confirmButtonText: 'Reconcile',
      preConfirm: () => {
        const documentType = (document.getElementById('docType') as HTMLInputElement)?.value;
        const documentId = Number((document.getElementById('docId') as HTMLInputElement)?.value || 0);
        const documentNo = (document.getElementById('docNo') as HTMLInputElement)?.value;
        if (!documentType || !documentId) {
          Swal.showValidationMessage('Document type and document id are required.');
          return false;
        }
        return { documentType, documentId, documentNo };
      }
    }).then(result => {
      if (!result.isConfirmed || !result.value) return;
      this.reconciliationService.reconcile({
        statementLineId: row.id,
        ...result.value,
        remarks: 'Matched from bank reconciliation screen'
      }).subscribe({
        next: () => {
          Swal.fire('Reconciled', 'Statement line reconciled.', 'success');
          this.loadLines();
        },
        error: (err) => Swal.fire('Error', this.getErrorMessage(err, 'Reconcile failed.'), 'error')
      });
    });
  }

  unreconcile(row: BankStatementLine): void {
    this.reconciliationService.unreconcile(row.id).subscribe({
      next: () => {
        Swal.fire('Updated', 'Statement line unreconciled.', 'success');
        this.loadLines();
      },
      error: (err) => Swal.fire('Error', this.getErrorMessage(err, 'Unreconcile failed.'), 'error')
    });
  }

  private parseImportText(): any[] {
    return (this.importText || '')
      .split(/\r?\n/)
      .map(x => x.trim())
      .filter(Boolean)
      .map(line => {
        const [transactionDate, description, referenceNo, debit, credit] = line.split(',').map(x => x?.trim());
        return {
          transactionDate,
          description,
          referenceNo,
          debit: Number(debit || 0),
          credit: Number(credit || 0)
        };
      })
      .filter(x => !!x.transactionDate);
  }

  private getErrorMessage(err: any, fallback: string): string {
    return err?.error?.message || err?.error?.Message || err?.message || fallback;
  }
}
