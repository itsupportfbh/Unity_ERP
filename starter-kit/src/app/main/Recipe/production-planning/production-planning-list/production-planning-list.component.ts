import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ProductionPlanLineDto, ProductionPlanService } from '../production-plan.service';
@Component({
  selector: 'app-production-planning-list',
  templateUrl: './production-planning-list.component.html',
  styleUrls: ['./production-planning-list.component.scss'],
  encapsulation:ViewEncapsulation.None
})
export class ProductionPlanningListComponent implements OnInit {
  rows: any[] = [];
  allRows: any[] = [];
  searchValue = '';

  showExplosionModal = false;
  explosionRows: any[] = [];
   modalTitle = '';
planLines: ProductionPlanLineDto[] = [];

showShortageGrnModal = false;
shortageGrnList: any[] = [];
shortageGrnCount = 0;
shortageGrnSearch = '';
selectedOption = 10;
  constructor(private srv: ProductionPlanService, private router: Router) {}

  ngOnInit(): void {
    this.load();
    this.loadShortageGrnCount();

  }

  load(): void {
    this.srv.getProductionPlanList().subscribe({
      next: (res:any) => {
        const data = res?.data ?? [];
        this.rows = data;
        this.allRows = data;
      },
      error: (e) => console.error(e)
    });
  }

  applyFilter(): void {
    const v = (this.searchValue || '').toLowerCase();
    this.rows = this.allRows.filter(r =>
      String(r.id).includes(v) ||
      String(r.salesOrderNo || '').toLowerCase().includes(v) ||
      String(r.status || '').toLowerCase().includes(v)
    );
  }

  // openCreateFromSo(): void {
  //   // simplest: ask SO id and create
  //   Swal.fire({
  //     title: 'Create Production Plan',
  //    input: 'text', 
  //     inputLabel: 'Enter SalesOrderId',
  //     showCancelButton: true,
  //     confirmButtonText: 'Create'
      
  //   }).then(r => {
  //     if (!r.isConfirmed) return;

  //     const soId = Number(r.value || 0);
  //     if (!soId) return;

  //     this.srv.createFromSo({ salesOrderId: soId }).subscribe({
  //       next: () => {
  //         Swal.fire('Created', 'Production plan created', 'success');
  //         this.load();
  //       },
  //       error: (e) => Swal.fire('Failed', e?.error?.message || 'Create failed', 'error')
  //     });
  //   });
  // }

  edit(id: number): void {
    this.router.navigate(['/Recipe/productionplanningedit', id]);
  }

  // remove(id: number): void {
  //   Swal.fire({
  //     title: 'Delete?',
  //     text: 'This will mark plan as Deleted.',
  //     icon: 'warning',
  //     showCancelButton: true,
  //     confirmButtonText: 'Yes, delete'
  //   }).then(r => {
  //     if (!r.isConfirmed) return;

  //     this.srv.delete(id).subscribe({
  //       next: () => {
  //         Swal.fire('Deleted', 'Plan deleted', 'success');
  //         this.load();
  //       },
  //       error: (e) => Swal.fire('Failed', e?.error?.message || 'Delete failed', 'error')
  //     });
  //   });
  // }

 openExplosion(row: any): void {
    const lines = (row?.lines ?? []) as ProductionPlanLineDto[];

    this.planLines = lines;
     this.modalTitle = `Plan Lines - Plan ${row?.salesOrderNo ? ' / ' + row.salesOrderNo : ''}`;


    this.showExplosionModal = true;

    if (!lines.length) {
      Swal.fire('No Lines', 'This plan has no lines.', 'info');
    }
  }
goToCreate(): void {
    this.router.navigate(['/Recipe/productionplanningcreate']); // adjust route
  }
  closeExplosion(): void {
    this.showExplosionModal = false;
    this.explosionRows = [];
  }

  openShortageGrnAlerts() {
  this.showShortageGrnModal = true;
  this.loadShortageGrnAlerts();
}

closeShortageGrnModal() {
  this.showShortageGrnModal = false;
}

loadShortageGrnAlerts() {
  this.srv.getShortageGrnAlerts().subscribe({
    next: (res: any) => {
      this.shortageGrnList = res?.data ?? [];
      this.shortageGrnCount = res?.count ?? this.shortageGrnList.length;
    },
    error: () => {
      this.shortageGrnList = [];
      this.shortageGrnCount = 0;
    }
  });
}

loadShortageGrnCount() {
  this.srv.getShortageGrnAlerts().subscribe({
    next: (res: any) => {
      const list = res?.data ?? [];
      this.shortageGrnCount = res?.count ?? list.length;
    },
    error: () => this.shortageGrnCount = 0
  });
}

filteredShortageGrnList(): any[] {
  const v = (this.shortageGrnSearch || '').toLowerCase().trim();
  if (!v) return this.shortageGrnList;

  return this.shortageGrnList.filter((x: any) =>
    String(x.productionPlanId || '').includes(v) ||
    String(x.salesOrderNo || '').toLowerCase().includes(v) ||
    String(x.grnNo || '').toLowerCase().includes(v)
  );
}
 remove(id: number): void {
  Swal.fire({
    title: 'Delete Plan?',
    text: `Plan Id: ${id}`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel'
  }).then(r => {
    if (!r.isConfirmed) return;

    this.srv.deletePlan(id).subscribe({
      next: (res: any) => {
        Swal.fire('Deleted', 'Production plan deleted', 'success');

        // ✅ remove from UI list without reloading (fast)
        this.rows = (this.rows || []).filter(x => Number(x?.id) !== Number(id));
        this.allRows = (this.allRows || []).filter(x => Number(x?.id) !== Number(id));

        // optional: if modal open for that plan close
        if (this.showExplosionModal) this.closeExplosion();
      },
      error: (e) => {
        Swal.fire('Failed', e?.error?.message || 'Delete failed', 'error');
      }
    });
  });
}
  onLimitChange(e: any): void {
    this.selectedOption = Number(e?.target?.value || 10);
  }
}
