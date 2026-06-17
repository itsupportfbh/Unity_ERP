import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { BatchProductionService } from '../batch-production-service';
import * as feather from 'feather-icons';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-batch-production-list',
  templateUrl: './batch-production-list.component.html',
  styleUrls: ['./batch-production-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class BatchProductionListComponent implements OnInit {

  rows: any[] = [];
  tempRows: any[] = [];

  selectedOption = 10;
  searchValue = '';

  // modal
  showLinesModal = false;
  selectedBatch: any = null;  // header info
  selectedLines: any[] = [];

  userId: number = 0;
  functionId = 'bp-list';
  
  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private router: Router,
    private api: BatchProductionService,private permissionService: PermissionService
  ) {this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);}

  ngOnInit(): void {
    this.loadPermission();
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
            this.loadList();
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
  canExport(): boolean {
    return this.permissionService.hasExport(this.permission);
  }
  ngAfterViewInit() {
    feather.replace();
  }

  loadList(): void {
    this.api.listBatches().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res ?? [];
        this.rows = (Array.isArray(data) ? data : []).map((x: any) => ({
        ...x,
        foodPrepStatus: x.foodPrepStatus ?? x.FoodPrepStatus ?? 1
      }));
        this.tempRows = [...this.rows];
      },
      error: (e) => console.error(e)
    });
  }

  onLimitChange(e: any): void {
    this.selectedOption = Number(e?.target?.value || 10);
  }

  filterUpdate(event: any): void {
    const val = (event?.target?.value || '').toLowerCase();
    this.searchValue = event?.target?.value || '';

    if (!val) {
      this.rows = [...this.tempRows];
      return;
    }

    this.rows = this.tempRows.filter((d: any) => {
      const batchNo = String(d.batchNo ?? '').toLowerCase();
      const planNo  = String(d.productionPlanNo ?? '').toLowerCase();
      const outlet  = String(d.name ?? '').toLowerCase();
      const status  = String(d.status ?? '').toLowerCase();
      return batchNo.includes(val) || planNo.includes(val) || outlet.includes(val) || status.includes(val);
    });
  }

  goToCreate(): void {
    this.router.navigate(['Recipe/batchproductioncreate']);
  }

  editBatch(id: number): void {
    this.router.navigate(['Recipe/batchproductionedit', id]);
  }

  deleteBatch(id: number): void {
    Swal.fire({
      title: 'Delete?',
      text: 'This batch will be removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete'
    }).then(r => {
      if (!r.isConfirmed) return;

      this.api.deleteBatch(id).subscribe({
        next: () => {
          Swal.fire('Deleted', 'Batch deleted', 'success');
          this.loadList();
        },
        error: (e) => {
          console.error(e);
          Swal.fire('Error', 'Delete failed', 'error');
        }
      });
    });
  }

  quickPost(row: any): void {
    const id = Number(row?.id || 0);
    if (!id) return;

    Swal.fire({
      title: 'Post to Inventory?',
      text: 'This will update stock / inventory.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, post'
    }).then(r => {
      if (!r.isConfirmed) return;

      this.api.postToInventory(id).subscribe({
        next: () => {
          Swal.fire('Posted', 'Inventory updated', 'success');
          this.loadList();
        },
        error: (e) => {
          console.error(e);
          Swal.fire('Error', 'Post failed', 'error');
        }
      });
    });
  }

  // ✅ modal open
  openLinesModal(row: any): void {
    const id = Number(row?.id || 0);
    if (!id) return;

    // take header from list row first
    this.selectedBatch = {
      batchNo: row?.batchNo ?? '-',
      productionPlanNo: row?.productionPlanNo ?? '-',
      status: row?.status ?? '-'
    };

    this.api.getBatchById(id).subscribe({
      next: (res: any) => {
        const dto = res?.data ?? res ?? {};

        // if API returns header, override
        const header = dto?.header ?? dto?.Header ?? null;
        if (header) {
          this.selectedBatch = {
            batchNo: header?.batchNo ?? header?.BatchNo ?? this.selectedBatch.batchNo,
            productionPlanNo: header?.productionPlanNo ?? header?.ProductionPlanNo ?? this.selectedBatch.productionPlanNo,
            status: header?.status ?? header?.Status ?? this.selectedBatch.status
          };
        }

        // lines
        const lines = dto?.lines ?? dto?.Lines ?? dto?.batchLines ?? dto?.BatchLines ?? [];
        this.selectedLines = Array.isArray(lines) ? lines : [];

        this.showLinesModal = true;
      },
      error: (e) => console.error(e)
    });
  }

  closeLinesModal(): void {
    this.showLinesModal = false;
    this.selectedBatch = null;
    this.selectedLines = [];
  }
openFoodPrepPopup(row: any): void {
  const id = Number(row?.id || 0);
  if (!id) return;

  const current = Number(row?.foodPrepStatus ?? 1);

  // ✅ only pending -> completed
  if (current === 2) {
    Swal.fire('Info', 'Food Preparation already completed.', 'info');
    return;
  }

  const batchNo = row?.batchNo || '-';
  const planNo  = row?.productionPlanNo || '-';

  Swal.fire({
    title: 'Complete Food Preparation',
    html: `
      <div class="fpX">
        <div class="fpX__meta">
          <div class="fpX__pill">
            <span class="k">Batch</span>
            <span class="v">${batchNo}</span>
          </div>
          <div class="fpX__pill">
            <span class="k">Plan</span>
            <span class="v">${planNo}</span>
          </div>
        </div>

        <div class="fpX__hint">
          Add remarks if needed, then click <b>Submit</b>.
        </div>

        <label class="fpX__lbl">Remarks (optional)</label>
        <textarea id="fpRemarks"
          class="fpX__ta"
          placeholder="Type remarks..."
          rows="4"></textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Submit',
    cancelButtonText: 'Cancel',
    buttonsStyling: false, // ✅ we style by CSS
    customClass: {
      popup: 'fpSwal',
      title: 'fpSwal__title',
      htmlContainer: 'fpSwal__body',
      confirmButton: 'fpSwal__ok',
      cancelButton: 'fpSwal__cancel'
    },
    focusConfirm: false,
    preConfirm: () => {
      const remarks = (document.getElementById('fpRemarks') as HTMLTextAreaElement)?.value || '';
      return { remarks };
    }
  }).then(res => {
    if (!res.isConfirmed) return;

    this.api.updateFoodPrepStatus(id, 2, res.value?.remarks || '').subscribe({
      next: () => {
        Swal.fire('Success', 'Food Preparation marked as Completed', 'success');
        this.loadList();
      },
      error: (e) => {
        console.error(e);
        Swal.fire('Error', 'Failed to update food preparation', 'error');
      }
    });
  });
}
isFoodPrepDisabled(row: any): boolean {
  return Number(row?.foodPrepStatus ?? 1) === 2;
}
foodPrepTooltip(row: any): string {
  const s = Number(row?.foodPrepStatus ?? 1);
  return s === 2 ? 'Food Prep Done' : 'Food Prep Started';
}
getFoodPrepLabel(row: any): string {
  const s = Number(row?.foodPrepStatus ?? 1);
  return s === 2 ? 'Food Prep Done' : 'Food Prep Started';
}
}
