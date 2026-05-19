// src/app/main/financial/reports/ap-aging/ap-aging.component.ts

import {
  Component,
  OnInit,
  AfterViewInit,
  ViewEncapsulation
} from '@angular/core';

import { ApAgingInvoice, ApAgingSummary } from './ap-aging-model';
import { ApAgingService } from './ap-aging-service';
import { SupplierService } from 'app/main/businessPartners/supplier/supplier.service';

import * as feather from 'feather-icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ap-aging',
  templateUrl: './ap-aging.component.html',
  styleUrls: ['./ap-aging.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class APAgingComponent implements OnInit, AfterViewInit {
  fromDate: string;
  toDate: string;

  rows: ApAgingSummary[] = [];
  filteredRows: ApAgingSummary[] = [];
  detailRows: ApAgingInvoice[] = [];

  supplierOptions: Array<{ supplierId: number; name: string }> = [];
  selectedSupplierId: number | null = null;

  isLoading = false;
  isDetailOpen = false;
  selectedSupplierName = '';

  totalOutstandingAll = 0;
  total0_30 = 0;
  total31_60 = 0;
  total61_90_90Plus = 0;

  showEmailModal = false;
  selectedInvoiceForEmail: any = null;
 userId: number;
          functionId = 'ap';
        
          permission: FunctionPermission;
            isPermissionLoaded = false;
            isPageLoading = false;

  constructor(
    private agingService: ApAgingService,
    private supplierService: SupplierService,
       private permissionService : PermissionService
  ) {
    const today = new Date();
    this.toDate = today.toISOString().substring(0, 10);

    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDate = firstOfMonth.toISOString().substring(0, 10);

    this.userId = Number(localStorage.getItem('id') );
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    // this.loadSummary();
    this.loadSuppliers();
    this.loadPermission();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

    loadPermission(): void {
            if (!this.userId || this.userId <= 0) {
              this.permission = this.permissionService.getEmptyPermission(this.functionId);
              this.isPermissionLoaded = true;
        
              Swal.fire({
                icon: 'warning',
                title: 'Access Denied',
                text: 'User not found. Please login again.',
                confirmButtonColor: '#0e3a4c'
              });
              return;
            }
        
            this.isPageLoading = true;
        
            this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
              next: (res: FunctionPermission) => {
                this.permission = res || this.permissionService.getEmptyPermission(this.functionId);
                this.isPermissionLoaded = true;
                this.isPageLoading = false;
        
                if (this.canView()) {
                  this.loadSummary();
                } else {
                  this.rows = [];
                  // this.isDisplay = false;
                }
              },
              error: (err) => {
                console.error('Permission load error:', err);
                this.permission = this.permissionService.getEmptyPermission(this.functionId);
                this.isPermissionLoaded = true;
                this.isPageLoading = false;
        
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'Unable to load permission.',
                  confirmButtonColor: '#d33'
                });
              }
            });
          }
        
          canView(): boolean {
            return this.permissionService.hasView(this.permission);
          }
        
          canCreate(): boolean {
            return this.permissionService.hasCreate(this.permission);
          }
        
          canEdit(): boolean {
            return this.permissionService.hasEdit(this.permission);
          }
        
          canDelete(): boolean {
            return this.permissionService.hasDelete(this.permission);
          }
  
          canApprove(): boolean{
            return this.permissionService.hasApprove(this.permission);
          }

          canExport(): boolean{
            return this.permissionService.hasExport(this.permission)
          }

  loadSummary(): void {
    this.isLoading = true;

    this.agingService.getSummary(this.fromDate, this.toDate).subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];

        this.rows = data.map((x: any) => this.mapSummaryRow(x));
        this.isLoading = false;

        this.applySupplierFilter();
      },
      error: () => {
        this.isLoading = false;
        this.rows = [];
        this.filteredRows = [];
        this.recalculateTotals();
      }
    });
  }

  private mapSummaryRow(x: any): ApAgingSummary {
    const supplierId = Number(x.supplierId || x.SupplierId || 0);
    const supplierName = x.supplierName || x.SupplierName || '';

    const rawOutstanding = Number(
      x.totalOutstanding ||
      x.TotalOutstanding ||
      x.outstandingAmount ||
      x.OutstandingAmount ||
      0
    );

    const advanceAmount = Number(
      x.advanceAmount ||
      x.AdvanceAmount ||
      x.advanceAppliedAmount ||
      x.AdvanceAppliedAmount ||
      x.totalAdvance ||
      x.TotalAdvance ||
      0
    );

    const fixedOutstanding = Math.max(rawOutstanding - advanceAmount, 0);

    const bucket0_30 = Number(x.bucket0_30 || x.Bucket0_30 || x.bucket030 || x.Bucket030 || 0);
    const bucket31_60 = Number(x.bucket31_60 || x.Bucket31_60 || x.bucket3160 || x.Bucket3160 || 0);
    const bucket61_90 = Number(x.bucket61_90 || x.Bucket61_90 || x.bucket6190 || x.Bucket6190 || 0);
    const bucket90Plus = Number(x.bucket90Plus || x.Bucket90Plus || x.bucket90_Plus || x.Bucket90_Plus || 0);

    const bucketTotal = bucket0_30 + bucket31_60 + bucket61_90 + bucket90Plus;

    if (advanceAmount > 0 && bucketTotal > fixedOutstanding) {
      let remainingAdvance = advanceAmount;

      let b0 = bucket0_30;
      let b31 = bucket31_60;
      let b61 = bucket61_90;
      let b90 = bucket90Plus;

      const apply0 = Math.min(b0, remainingAdvance);
      b0 -= apply0;
      remainingAdvance -= apply0;

      const apply31 = Math.min(b31, remainingAdvance);
      b31 -= apply31;
      remainingAdvance -= apply31;

      const apply61 = Math.min(b61, remainingAdvance);
      b61 -= apply61;
      remainingAdvance -= apply61;

      const apply90 = Math.min(b90, remainingAdvance);
      b90 -= apply90;

      return {
        supplierId,
        supplierName,
        bucket0_30: Number(b0.toFixed(2)),
        bucket31_60: Number(b31.toFixed(2)),
        bucket61_90: Number(b61.toFixed(2)),
        bucket90Plus: Number(b90.toFixed(2)),
        totalOutstanding: Number(fixedOutstanding.toFixed(2))
      } as ApAgingSummary;
    }

    return {
      supplierId,
      supplierName,
      bucket0_30: Number(bucket0_30.toFixed(2)),
      bucket31_60: Number(bucket31_60.toFixed(2)),
      bucket61_90: Number(bucket61_90.toFixed(2)),
      bucket90Plus: Number(bucket90Plus.toFixed(2)),
      totalOutstanding: Number(fixedOutstanding.toFixed(2))
    } as ApAgingSummary;
  }

  loadSuppliers(): void {
    this.supplierService.GetAllSupplier().subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];

        this.supplierOptions = data.map((x: any) => ({
          supplierId: Number(x.supplierId || x.SupplierId || x.id || x.Id || 0),
          name: x.name || x.supplierName || x.SupplierName || x.Name || ''
        }));
      },
      error: () => {
        this.supplierOptions = [];
      }
    });
  }

  onFilterChange(): void {
    this.loadSummary();

    if (this.isDetailOpen) {
      this.isDetailOpen = false;
      this.detailRows = [];
    }
  }

  onSupplierChange(): void {
    this.applySupplierFilter();
    this.isDetailOpen = false;
    this.detailRows = [];
  }

  private applySupplierFilter(): void {
    if (this.selectedSupplierId == null) {
      this.filteredRows = [...this.rows];
    } else {
      this.filteredRows = this.rows.filter(
        r => Number(r.supplierId) === Number(this.selectedSupplierId)
      );
    }

    this.recalculateTotals();
  }

  private recalculateTotals(): void {
    const src = this.filteredRows || [];

    this.totalOutstandingAll = Number(
      src.reduce((sum, r) => sum + Number(r.totalOutstanding || 0), 0).toFixed(2)
    );

    this.total0_30 = Number(
      src.reduce((sum, r) => sum + Number(r.bucket0_30 || 0), 0).toFixed(2)
    );

    this.total31_60 = Number(
      src.reduce((sum, r) => sum + Number(r.bucket31_60 || 0), 0).toFixed(2)
    );

    const total61_90 = src.reduce(
      (sum, r) => sum + Number(r.bucket61_90 || 0),
      0
    );

    const total90Plus = src.reduce(
      (sum, r) => sum + Number(r.bucket90Plus || 0),
      0
    );

    this.total61_90_90Plus = Number((total61_90 + total90Plus).toFixed(2));
  }

  openDetail(row: ApAgingSummary): void {
    this.selectedSupplierName = row.supplierName;
    this.isDetailOpen = true;

    this.agingService
      .getSupplierInvoices(row.supplierId, this.fromDate, this.toDate)
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || [];
          this.detailRows = data.map((x: any) => this.mapDetailRow(x));
        },
        error: () => {
          this.detailRows = [];
        }
      });
  }

  private mapDetailRow(x: any): ApAgingInvoice {
    const invoiceAmount = Number(
      x.invoiceAmount ||
      x.InvoiceAmount ||
      x.grandTotal ||
      x.GrandTotal ||
      x.amount ||
      x.Amount ||
      0
    );

    const paidAmount = Number(x.paidAmount || x.PaidAmount || 0);
    const debitNoteAmount = Number(x.debitNoteAmount || x.DebitNoteAmount || 0);

    const advanceAmount = Number(
      x.advanceAmount ||
      x.AdvanceAmount ||
      x.advanceAppliedAmount ||
      x.AdvanceAppliedAmount ||
      0
    );

    const outstanding = Math.max(
      invoiceAmount - paidAmount - debitNoteAmount - advanceAmount,
      0
    );

    return {
      ...x,
      invoiceId: Number(x.invoiceId || x.InvoiceId || x.id || x.Id || 0),
      supplierId: Number(x.supplierId || x.SupplierId || 0),
      supplierName: x.supplierName || x.SupplierName || '',
      supplierEmail: x.supplierEmail || x.SupplierEmail || '',
      invoiceNo: x.invoiceNo || x.InvoiceNo || '',
      invoiceDate: x.invoiceDate || x.InvoiceDate,
      dueDate: x.dueDate || x.DueDate,
      invoiceAmount: Number(invoiceAmount.toFixed(2)),
      paidAmount: Number(paidAmount.toFixed(2)),
      debitNoteAmount: Number(debitNoteAmount.toFixed(2)),
      advanceAmount: Number(advanceAmount.toFixed(2)),
      outstandingAmount: Number(outstanding.toFixed(2))
    } as ApAgingInvoice;
  }

  closeDetail(): void {
    this.isDetailOpen = false;
    this.detailRows = [];
  }

  openEmailModal(row: ApAgingInvoice): void {
    this.selectedInvoiceForEmail = {
      id: row.invoiceId,
      invoiceId: row.invoiceId,
      docType: 'PIN',
      invoiceNo: row.invoiceNo,
      partyName: row.supplierName,
      supplierName: row.supplierName,
      email: row.supplierEmail || ''
    };

    this.showEmailModal = true;
  }

  closeEmailModal(): void {
    this.showEmailModal = false;
    this.selectedInvoiceForEmail = null;
  }

  onEmailModalBackdropClick(event: MouseEvent): void {
    this.closeEmailModal();
  }

  private buildExportRows(): any[] {
    return (this.filteredRows || []).map((r, index) => ({
      'Sl. No': index + 1,
      Supplier: r.supplierName,
      '0-30': Number(r.bucket0_30 || 0),
      '31-60': Number(r.bucket31_60 || 0),
      '61-90': Number(r.bucket61_90 || 0),
      '90+': Number(r.bucket90Plus || 0),
      'Total Outstanding': Number(r.totalOutstanding || 0)
    }));
  }

  exportToExcel(): void {
    const data = this.buildExportRows();

    if (!data.length) {
      return;
    }

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, 'AP Aging');

    const fileName = `AP-Aging-${this.fromDate}-to-${this.toDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  exportToPdf(): void {
    const rows = this.filteredRows || [];

    if (!rows.length) {
      return;
    }

    const doc = new jsPDF('l', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(12);
    doc.text(`AP Aging (${this.fromDate} to ${this.toDate})`, pageWidth / 2, 30, {
      align: 'center'
    });

    const head = [[
      'Sl. No',
      'Supplier',
      '0-30',
      '31-60',
      '61-90',
      '90+',
      'Total Outstanding'
    ]];

    const body = rows.map((r, index) => [
      (index + 1).toString(),
      r.supplierName,
      Number(r.bucket0_30 || 0).toFixed(2),
      Number(r.bucket31_60 || 0).toFixed(2),
      Number(r.bucket61_90 || 0).toFixed(2),
      Number(r.bucket90Plus || 0).toFixed(2),
      Number(r.totalOutstanding || 0).toFixed(2)
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 45,
      margin: { left: 40, right: 40 },
      styles: {
        fontSize: 9,
        halign: 'right',
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'left' }
      },
      headStyles: {
        halign: 'center'
      }
    });

    doc.save(`AP-Aging-${this.fromDate}-to-${this.toDate}.pdf`);
  }
}