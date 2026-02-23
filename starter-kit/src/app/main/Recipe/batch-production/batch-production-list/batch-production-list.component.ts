import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { BatchProductionService } from '../batch-production-service';
import * as feather from 'feather-icons';

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

  constructor(
    private router: Router,
    private api: BatchProductionService
  ) {}

  ngOnInit(): void {
    this.loadList();
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

  const current = Number(row?.foodPrepStatus ?? 1); // default assume pending

  // ✅ only pending -> completed
  if (current === 2) {
    Swal.fire('Info', 'Food Preparation already completed.', 'info');
    return;
  }

  Swal.fire({
    title: 'Complete Food Preparation?',
    html: `
      <div style="text-align:left;">
        <div style="font-size:13px; margin-bottom:8px;">
          Batch: <b>${row?.batchNo || '-'}</b><br/>
          Plan: <b>${row?.productionPlanNo || '-'}</b>
        </div>

        <label style="font-weight:700; font-size:13px;">Remarks (optional)</label>
        <textarea id="fpRemarks" class="swal2-textarea"
          placeholder="Optional remarks..."
          style="min-height:80px"></textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Submit',
    preConfirm: () => ({
      remarks: (document.getElementById('fpRemarks') as HTMLTextAreaElement)?.value || ''
    })
  }).then(res => {
    if (!res.isConfirmed) return;

    // ✅ always set 2
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
  return s === 2 ? 'Food Preparation Completed' : 'Click to complete';
}
getFoodPrepLabel(row: any): string {
  const s = Number(row?.foodPrepStatus ?? 1);
  return s === 2 ? 'Food Prep Done' : 'Food Prep Started';
}
}
