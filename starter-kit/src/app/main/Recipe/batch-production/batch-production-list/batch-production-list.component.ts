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
  selectedBatch: any = null;
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
    // API: list batches
    this.api.listBatches().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res ?? [];
        this.rows = Array.isArray(data) ? data : [];
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
      const plan = String(d.planName ?? '').toLowerCase();
      const outlet = String(d.outletName ?? '').toLowerCase();
      const status = String(d.status ?? '').toLowerCase();
      return batchNo.includes(val) || plan.includes(val) || outlet.includes(val) || status.includes(val);
    });
  }

  goToCreate(): void {
    this.router.navigate(['Recipe/batchproductioncreate']); // adjust route
  }

  editBatch(id: number): void {
    this.router.navigate(['Recipe/batchproductionedit', id]); // adjust route
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

  // quick post from list
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

  // ========== Lines modal ==========
  openLinesModal(row: any): void {
    const id = Number(row?.id || 0);
    if (!id) return;

    this.api.getBatchById(id).subscribe({
      next: (res: any) => {
        const dto = res?.data ?? res ?? {};
        this.selectedBatch = dto;
        this.selectedLines = dto?.lines ?? dto?.batchLines ?? [];
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

}





