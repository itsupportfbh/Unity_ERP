import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountsPayableService } from 'app/main/financial/accounts-payable/accounts-payable.service';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';
import Swal from 'sweetalert2';

type ArTab = 'invoices' | 'receipts' | 'advance' | 'aging';

interface ArAdvanceListRow {
  id: number;
  customerId: number;
  customerName: string;
  advanceNo: string;
  advanceDate: string | Date;
  salesOrderId?: number | null;
  salesOrderNo?: string | null;
  amount: number;
  balanceAmount: number;
  paymentMode: string;
  bankAccountId?: number | null;
  bankName?: string | null;
  remarks?: string | null;
}

@Component({
  selector: 'app-ar-combine',
  templateUrl: './ar-combine.component.html',
  styleUrls: ['./ar-combine.component.scss']
})
export class ARCombineComponent implements OnInit {

  activeTab: ArTab = 'invoices';

  // ========= ADVANCE LIST STATE =========
  arAdvances: ArAdvanceListRow[] = [];
  pagedArAdvances: ArAdvanceListRow[] = [];

  arTotalAdvanceAmount = 0;
  arTotalAdvanceBalance = 0;

  arAdvPage = 1;
  arAdvPageSize = 20;
  arAdvTotalPages = 1;
 isPeriodLocked = false;
  periodName = '';
    userId: any;
  functionId = 'ar';
    
  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private arService: AccountsPayableService,
    private periodLock: PeriodCloseService,private permissionService: PermissionService

  ) {this.userId = localStorage.getItem('id');
    this.permission = this.permissionService.getEmptyPermission(this.functionId);}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
              const tab = params.get('tab') as ArTab | null;
              if (tab) {
                this.activeTab = tab;
              }
            });

    this.loadPermission();
    this.checkPeriodLockForToday();
  }
 private checkPeriodLockForToday(): void {
  const today = new Date().toISOString().substring(0, 10); // yyyy-MM-dd

  this.periodLock.getStatusForDateWithName(today).subscribe({
    next: status => {
      this.isPeriodLocked = !!status?.isLocked;
      this.periodName = status?.periodName || '';
    },
    error: () => {
      this.isPeriodLocked = false;
      this.periodName = '';
    }
  });
}
   setTab(tab: ArTab): void {
    this.activeTab = tab;

    if (tab === 'advance') {
      this.refreshPermissionAndLoadAdvance();
    }
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
          console.log('Permission:', this.permission);
          console.log('Can Export:', this.canExport());
  
        if (this.canView()) {
            // Default load if initial tab is 'advance'
            if (this.activeTab === 'advance') {
              this.loadArAdvances();
            }
          } else {
            
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
  refreshPermissionAndLoadAdvance(): void {
      this.isPermissionLoaded = false;

      this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
        next: (res: FunctionPermission) => {
          this.permission = res || this.permissionService.getEmptyPermission(this.functionId);
          this.isPermissionLoaded = true;

          if (this.canView()) {
            this.loadArAdvances();
          }
        },
        error: () => {
          this.permission = this.permissionService.getEmptyPermission(this.functionId);
          this.isPermissionLoaded = true;
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
  canExport(): boolean {
    return this.permissionService.hasExport(this.permission);
  }

  // ================== ADVANCE LIST – LOAD & PAGING ==================

  loadArAdvances(): void {
    this.arService.getSupplierAdvancesList().subscribe({
      next: (res: any) => {
        const raw = res?.data || res || [];

        this.arAdvances = (raw as any[]).map(x => ({
          id: x.id,
          customerId: x.customerId,
          customerName: x.customerName || '',
          advanceNo: x.advanceNo,
          advanceDate: x.advanceDate,
          salesOrderId: x.salesOrderId,
          salesOrderNo: x.salesOrderNo,
          amount: Number(x.amount || 0),
          balanceAmount: Number(x.balanceAmount || 0),
          paymentMode: x.paymentMode,
          bankAccountId: x.bankAccountId,
          bankName: x.bankName,
          remarks: x.remarks
        }));

        // totals
        this.arTotalAdvanceAmount = 0;
        this.arTotalAdvanceBalance = 0;
        this.arAdvances.forEach(r => {
          this.arTotalAdvanceAmount += r.amount;
          this.arTotalAdvanceBalance += r.balanceAmount;
        });

        this.arAdvPage = 1;
        this.recalcArAdvPaging();
      },
      error: err => {
        console.error('Failed to load customer advances', err);
        this.arAdvances = [];
        this.pagedArAdvances = [];
        this.arTotalAdvanceAmount = 0;
        this.arTotalAdvanceBalance = 0;
      }
    });
  }

  recalcArAdvPaging(): void {
    const total = this.arAdvances.length || 0;
    this.arAdvTotalPages = Math.max(1, Math.ceil(total / this.arAdvPageSize));
    this.applyArAdvPage();
  }

  applyArAdvPage(): void {
    const start = (this.arAdvPage - 1) * this.arAdvPageSize;
    this.pagedArAdvances = this.arAdvances.slice(start, start + this.arAdvPageSize);
  }

  arAdvGoToPage(p: number): void {
    if (p < 1 || p > this.arAdvTotalPages) return;
    this.arAdvPage = p;
    this.applyArAdvPage();
  }

  // ================== NAVIGATION ==================

  goToNewAdvance(): void {
    // Your AR advance create screen route
    this.router.navigate(['/financial/ar-advance']);
  }
}
