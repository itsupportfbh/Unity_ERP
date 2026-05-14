// debit-note-list.component.ts
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';
import { DatePipe } from '@angular/common';
import { DebitNoteService } from '../debit-note.service';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';
import * as feather from 'feather-icons';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';
export interface PeriodStatusDto {
  isLocked: boolean;
  periodName?: string;
  periodCode?: string;
  startDate?: string;
  endDate?: string;
}

// this matches what you showed
export interface PeriodStatusResponseRaw {
  isSuccess?: boolean;
  isLocked?: boolean;
  periodName?: string;
  startDate?: string;
  endDate?: string;
  // in case backend later wraps in data
  data?: PeriodStatusDto | null;
}
@Component({
  selector: 'app-debit-note-list',
  templateUrl: './debit-note-list.component.html',
  styleUrls: ['./debit-note-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [DatePipe]
})
export class DebitNoteListComponent implements OnInit {

  @ViewChild(DatatableComponent) table!: DatatableComponent;

  rows: any[] = [];
  tempData: any[] = [];

  searchValue = '';
  ColumnMode = ColumnMode;
  selectedOption = 10;

  // modal state
  showLinesModal = false;
  modalLines: any[] = [];
  modalTotal = 0;
isPeriodLocked = false;
  currentPeriodName = '';

    userId: number;
    
        functionId = 'dn-list';
      
        permission: FunctionPermission;
          isPermissionLoaded = false;
          isPageLoading = false;
  
  constructor(
    private debitNoteService: DebitNoteService,
    private router: Router,
    private _coreSidebarService: CoreSidebarService,
    private datePipe: DatePipe,
    private periodService: PeriodCloseService,
     private permissionService : PermissionService
  ) {
    this.userId = Number(localStorage.getItem('id') || 0);
          this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
     const today = new Date().toISOString().substring(0, 10);
    this.checkPeriodLockForDate(today);
    this.loadPermission();
  }
  ngAfterViewInit(): void {
      feather.replace();
    }
  
    ngAfterViewChecked(): void {
      feather.replace();
    }
private checkPeriodLockForDate(dateStr: string): void {
    if (!dateStr) { return; }

    this.periodService.getStatusForDateWithName(dateStr).subscribe({
      next: (res: PeriodStatusDto | null) => {
        this.isPeriodLocked = !!res?.isLocked;
        this.currentPeriodName = res?.periodName || '';
      },
      error: () => {
        // if fails, UI side don’t hard-lock; backend will still protect
        this.isPeriodLocked = false;
        this.currentPeriodName = '';
      }
    });
  }

  private showPeriodLockedSwal(action: string): void {
    Swal.fire(
      'Period Locked',
      this.currentPeriodName
        ? `Period "${this.currentPeriodName}" is locked. You cannot ${action} in this period.`
        : `Selected accounting period is locked. You cannot ${action}.`,
      'warning'
    );
  }
 loadRequests(): void {
  this.debitNoteService.getAll().subscribe({
    next: (res: any) => {
      const data = res?.data || res || [];

      this.rows = data.map((req: any) => ({
        ...req,
        // make sure we ALWAYS have "status" in lower-case for the grid
        status: req.status ?? req.Status ?? 0,
        // your HTML uses row.poDate – map it from server fields
        poDate: req.poDate || req.noteDate || req.createdDate
      }));

      this.tempData = [...this.rows];

      if (this.table) {
        this.table.offset = 0;
      }

      // 👉 Quick debug
      console.log('DebitNote rows:', this.rows);
    },
    error: (err: any) => console.error('Error loading debit note list', err)
  });
}


  filterUpdate(event: any): void {
    const val = (event.target.value || '').toLowerCase();

    const temp = this.tempData.filter((d) => {
      const poDate = this.datePipe.transform(d.poDate, 'dd-MM-yyyy')?.toLowerCase() || '';

      if ((d.debitNoteNo || '').toLowerCase().includes(val) || !val) return true;
      if ((d.name || d.supplierName || '').toLowerCase().includes(val) || !val) return true;
      if ((d.reason || '').toLowerCase().includes(val) || !val) return true;
      if (poDate.includes(val) || !val) return true;
      return false;
    });

    this.rows = temp;
    if (this.table) this.table.offset = 0;
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
                  this.loadRequests();
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
  openCreate(): void {
     if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('create Purchase Requests');
      return;
    }
    this.router.navigate(['/purchase/create-debitnote']);
  }

  editDetails(row: any): void {
     if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('edit Purchase Requests');
      return;
    }
    this.router.navigate(['/purchase/edit-debitnote', row.id]);
  }

  deleteDetails(id: number): void {
     if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('delete Purchase Requests');
      return;
    }
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the Debit Note.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.debitNoteService.delete(id).subscribe({
          next: () => {
            this.loadRequests();
            Swal.fire('Deleted!', 'Debit Note has been deleted.', 'success');
          },
          error: (err) => {
            console.error('Error deleting debit note', err);
            Swal.fire('Error', 'Failed to delete debit note.', 'error');
          }
        });
      }
    });
  }

 openLinesModal(row: any): void {
  let lines: any[] = [];

  try {
    // support both camelCase and PascalCase JSON fields
    const raw = row.linesJson || row.LinesJson || '[]';
    lines = JSON.parse(raw);
  } catch {
    lines = [];
  }

  this.modalLines = lines || [];

  // compute total = sum(qty * price)
  this.modalTotal = this.modalLines.reduce(
    (sum, l) =>
      sum +
      (Number(l.qty) || 0) * (Number(l.price) || 0),
    0
  );

  this.showLinesModal = true;
}

  closeLinesModal(): void {
    this.showLinesModal = false;
    this.modalLines = [];
    this.modalTotal = 0;
  }
}
