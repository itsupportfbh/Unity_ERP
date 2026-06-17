import {
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  AfterViewInit,
  AfterViewChecked,
} from '@angular/core';
import { Router } from '@angular/router';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';

import { PurchaseService } from 'app/main/purchase/purchase.service';
import { PrDraftService } from '../../pr-draft.service';
import { PurchaseAlertService } from '../../purchase-alert.service';

// 🔒 NEW: period lock service
import {
  PeriodCloseService,
  PeriodStatusDto
} from 'app/main/financial/period-close-fx/period-close-fx.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';
import { ApprovalWorkflowService } from 'app/shared/approval-workflow.service';

type PurchaseAlert = {
  id: number;
  message: string;
  itemId?: number;
  itemName?: string;
  requiredQty?: number;
  warehouseId?: number | null;
  supplierId?: number | null;
  createdOn?: string;
};

@Component({
  selector: 'app-purchase-request-list',
  templateUrl: './purchase-request-list.component.html',
  styleUrls: ['./purchase-request-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class PurchaseRequestListComponent
  implements OnInit, AfterViewInit, AfterViewChecked {

  @ViewChild(DatatableComponent) table!: DatatableComponent;

  // datatable + filters
  rows: any[] = [];
  tempData: any[] = [];
  public ColumnMode = ColumnMode;
  public selectedOption = 10;
  public searchValue = '';

  // PR lines modal
  showLinesModal = false;
  modalLines: any[] = [];
  modalTotalQty = 0;
  isDisplay = false;
  // Drafts
  drafts: any[] = [];
  draftCount = 0;
  showDraftsModal = false;

   functionId = 'pr-list';
  
    permission: FunctionPermission;
    isPermissionLoaded = false;
    isPageLoading = false;

  // Alerts
  showAlertsPanel = false;
  alerts: PurchaseAlert[] = [];
  alertCount = 0;

 userId: number = 0;


  // 🔒 NEW: period lock flags
  isPeriodLocked = false;
  currentPeriodName = '';

  constructor(
    private purchaseService: PurchaseService,
    private draftSvc: PrDraftService,
    private router: Router,
    private alertSvc: PurchaseAlertService,
    // 🔒 NEW
    private periodService: PeriodCloseService,
     private permissionService: PermissionService,
     private approvalWorkflow: ApprovalWorkflowService
  ) {
    // this.userId = localStorage.getItem('id') || '';
     this.userId = Number(localStorage.getItem('id') || 0);
          this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  // ============== Lifecycle ==============

  ngOnInit(): void {
    // 🔒 check accounting period based on today's date
    const today = new Date().toISOString().substring(0, 10);
    this.checkPeriodLockForDate(today);

    // this.loadRequests();
    this.refreshDraftCount();
    this.refreshAlerts();

    this.loadPermission();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  ngAfterViewChecked(): void {
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
            this.loadRequests();
          } else {
            this.rows = [];
            this.isDisplay = false;
          }
        },
        error: () => {
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

    canApprove(): boolean {
      return this.permissionService.hasApprove(this.permission);
    }

    canReject(): boolean {
      return this.permissionService.hasReject(this.permission);
    }
  // ============== Period Lock (NEW) ==============

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

  // ============== Main PR list ==============

  loadRequests(): void {
    this.purchaseService.getAll().subscribe({
      next: (res: any) => {
        const list = (res?.data || []).map((req: any) => ({
          ...req,
          prLines: Array.isArray(req.prLines) ? req.prLines : this.safeParse(req.prLines),
        }));
        this.rows = list;
        this.tempData = [...list];
        if (this.table) this.table.offset = 0;
      },
      error: (err) => {
        this.rows = [];
        this.tempData = [];
        Swal.fire('Error', err?.error?.message || err?.message || 'Unable to load purchase requests.', 'error');
      },
    });
  }

  private safeParse(json: any): any[] {
    try {
      return JSON.parse(json || '[]');
    } catch {
      return [];
    }
  }

  filterUpdate(event: any): void {
    const val = (event?.target?.value ?? '').toString().toLowerCase();
    if (!val) {
      this.rows = [...this.tempData];
      if (this.table) this.table.offset = 0;
      return;
    }
    this.rows = this.tempData.filter((d: any) =>
      (d.purchaseRequestNo || '').toLowerCase().includes(val) ||
      (d.requester || '').toLowerCase().includes(val) ||
      (d.departmentName || '').toLowerCase().includes(val) ||
      (d.deliveryDate || '').toLowerCase().includes(val)
    );
    if (this.table) this.table.offset = 0;
  }

  onLimitChange(e: any): void {
    const v = Number(e?.target?.value || 10);
    this.selectedOption = v > 0 ? v : 10;
    if (this.table) this.table.offset = 0;
  }

  editRequest(id: number): void {
    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('edit Purchase Requests');
      return;
    }
    this.router.navigateByUrl(`/purchase/Edit-PurchaseRequest/${id}`);
  }

  goToCreate(): void {
    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('create Purchase Requests');
      return;
    }
    this.router.navigate(['/purchase/Create-PurchaseRequest']);
  }

  deleteRequest(id: number): void {
    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('delete Purchase Requests');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the purchase request.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    }).then((r) => {
      if (r.value) {
        this.purchaseService.delete(id).subscribe({
          next: () => {
            this.loadRequests();
            Swal.fire('Deleted!', 'Purchase request has been deleted.', 'success');
          },
          error: (err) => Swal.fire('Error', err?.error?.message || err?.message || 'Failed to delete purchase request.', 'error'),
        });
      }
    });
  }

  approveRejectRequest(row: any, status: number): void {
    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal(status === 2 ? 'approve Purchase Requests' : 'reject Purchase Requests');
      return;
    }

    if (status === 2 && !this.canApprove()) {
      Swal.fire('Access Denied', 'You do not have approve permission.', 'warning');
      return;
    }

    if (status === 3 && !this.canReject()) {
      Swal.fire('Access Denied', 'You do not have reject permission.', 'warning');
      return;
    }

    const actionText = status === 2 ? 'approve' : 'reject';

    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to ${actionText} this PR?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: status === 2 ? 'Approve' : 'Reject',
      confirmButtonColor: status === 2 ? '#28a745' : '#dc3545'
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = {
        documentType: 'PR' as const,
        documentId: Number(row.id ?? row.ID),
        remarks: status === 2 ? 'PR approved from list' : 'PR rejected from list'
      };

      const action$ = status === 2
        ? this.approvalWorkflow.approve(request)
        : this.approvalWorkflow.reject(request);

      action$.subscribe({
        next: () => {
          Swal.fire('Success', `PR ${status === 2 ? 'approved' : 'rejected'} successfully`, 'success');
          this.loadRequests();
        },
        error: (err) => {
          Swal.fire('Error', err?.error?.message || `Failed to ${actionText} PR.`, 'error');
        }
      });
    });
  }

  // ============== Row lines modal ==============

  openLinesModal(row: any): void {
    const lines = Array.isArray(row?.prLines) ? row.prLines : this.safeParse(row?.prLines);
    const total = (lines || []).reduce(
      (sum: number, l: any) => sum + (Number(l?.qty) || 0),
      0
    );
    this.modalLines = lines || [];
    this.modalTotalQty = total;
    this.showLinesModal = true;
  }

  closeLinesModal(): void {
    this.showLinesModal = false;
  }

  // ============== Drafts ==============

  openDrafts(): void {
    this.showDraftsModal = true;
    this.loadDrafts();
  }

  closeDrafts(): void {
    this.showDraftsModal = false;
  }

  loadDrafts(): void {
    this.draftSvc.getAll().subscribe({
      next: (res) => {
        const list = res?.data ?? [];
        this.drafts = list.filter((x: any) => +x.status === 0 || x.status == null);
      },
      error: (err) => {
        this.drafts = [];
        Swal.fire('Error', err?.error?.message || err?.message || 'Unable to load drafts.', 'error');
      },
    });
  }

  refreshDraftCount(): void {
    this.draftSvc.getAll().subscribe({
      next: (res) => {
        const list = res?.data ?? [];
        this.draftCount = list.filter((x: any) => +x.status === 0 || x.status == null).length;
      },
      error: () => (this.draftCount = 0),
    });
  }

  // ============== Alerts ==============

  toggleAlerts(): void {
    this.showAlertsPanel = !this.showAlertsPanel;
    if (this.showAlertsPanel) {
      this.refreshAlerts();
    }
  }

  closeAlerts()  { this.showAlertsPanel = false; }

  refreshAlerts(): void {
    this.alertSvc.getUnread().subscribe({
      next: (res: any) => {
        const list: PurchaseAlert[] = res?.data ?? [];
        this.alerts = list;
        this.alertCount = list.length;
      },
      error: (err) => {
        this.alerts = [];
        this.alertCount = 0;
      }
    });
  }

  acknowledgeAlert(a: PurchaseAlert): void {
    this.alertSvc.markRead(a.id).subscribe({
      next: () => {
        this.alerts = this.alerts.filter(x => x.id !== a.id);
        this.alertCount = this.alerts.length;

        const msg = a?.message || 'Alert acknowledged';
        Swal.fire({
          icon: 'info',
          title: 'Stock Needed',
          text: msg,
          confirmButtonColor: '#2E5F73'
        });
        this.showAlertsPanel = false;
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: 'Could not mark alert as read',
          confirmButtonColor: '#2E5F73'
        });
      }
    });
  }

  acknowledgeAll(): void {
    if (!this.alerts.length) return;
    this.alertSvc.markAll().subscribe({
      next: () => {
        this.alerts = [];
        this.alertCount = 0;
        Swal.fire({
          icon: 'success',
          title: 'All Alerts Acknowledged',
          text: 'You have cleared all shortage notifications.',
          confirmButtonColor: '#2E5F73'
        });
        this.showAlertsPanel = false;
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: 'Could not clear alerts',
          confirmButtonColor: '#2E5F73'
        });
      }
    });
  }

  // util
  trackById(_: number, row: any) {
    return row?.id ?? _;
  }

  trackByAlertId(_: number, a: PurchaseAlert) {
    return a?.id ?? _;
  }
 promoteDraft(id: number): void {
  if (this.isPeriodLocked) {
    this.showPeriodLockedSwal('open Purchase Request drafts');
    return;
  }

  Swal.fire({
    title: 'Open draft?',
    text: 'Continue editing this draft.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Open',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#2E5F73',
    cancelButtonColor: '#6c757d',
  }).then((r) => {
    if (r.value) {
      this.router.navigate(['/purchase/Create-PurchaseRequest'], { queryParams: { draftId: id } });
    }
  });
}

deleteDraft(id: number): void {
  if (this.isPeriodLocked) {
    this.showPeriodLockedSwal('delete Purchase Request drafts');
    return;
  }

  this.draftSvc.delete(id, this.userId).subscribe({
    next: () => {
      Swal.fire('Deleted', 'Draft removed.', 'success');
      this.loadDrafts();
      this.refreshDraftCount();
    },
    error: () => Swal.fire('Delete Failed', 'Try again.', 'error'),
  });
}
}
