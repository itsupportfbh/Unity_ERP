import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ProductionPlanLineDto, ProductionPlanPrintDto, ProductionPlanService } from '../production-plan.service';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
const vfs = (pdfFonts as any)?.pdfMake?.vfs || (pdfFonts as any)?.vfs;
if (!vfs) {
  console.error('pdfmake vfs not found. Check vfs_fonts import', pdfFonts);
}
(pdfMake as any).vfs = vfs;

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
   downloadPdf(planId: number): void {
    if (!planId) return;

    Swal.fire({
      title: 'Preparing PDF…',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.srv.getPlanPrint(planId).subscribe({
      next: (res: any) => {
        Swal.close();
        const dto: ProductionPlanPrintDto = res?.data;
        if (!dto?.header) {
          Swal.fire('Error', 'Print data not found', 'error');
          return;
        }
        this.buildAndDownloadPdf(dto);
      },
      error: (e) => {
        Swal.close();
        Swal.fire('Error', e?.error?.message || 'Failed to load print data', 'error');
      }
    });
  }

  private buildAndDownloadPdf(dto: ProductionPlanPrintDto): void {
    const h = dto.header;

    // group ingredients by recipeId
    const ingByRecipe = new Map<number, any[]>();
    (dto.ingredients || []).forEach(x => {
      const key = Number(x.recipeId || 0);
      if (!ingByRecipe.has(key)) ingByRecipe.set(key, []);
      ingByRecipe.get(key)!.push(x);
    });

    const brand = '#2E5F73';

    const headerBlock = [
      { text: 'Production Plan', fontSize: 18, bold: true, color: brand, margin: [0, 0, 0, 4] },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: `Plan No: ${h.productionPlanNo || h.id}`, margin: [0, 2, 0, 0] },
              { text: `SO No: ${h.salesOrderNo || h.salesOrderId}`, margin: [0, 2, 0, 0] },
              { text: `Warehouse: ${h.warehouseName || h.warehouseId}`, margin: [0, 2, 0, 0] }
            ]
          },
          {
            width: 200,
            alignment: 'right',
            stack: [
              { text: `Plan Date: ${this.fmtDate(h.planDate)}`, margin: [0, 2, 0, 0] },
              { text: `Status: ${h.status || ''}`, margin: [0, 2, 0, 0] }
            ]
          }
        ],
        margin: [0, 0, 0, 10]
      }
    ];

    const planTableBody: any[] = [
      [
        { text: 'Recipe', bold: true, color: 'white', fillColor: brand, margin: [6, 6, 6, 6] },
        { text: 'Planned Qty', bold: true, color: 'white', fillColor: brand, margin: [6, 6, 6, 6], alignment: 'right' },
        { text: 'Expected Output', bold: true, color: 'white', fillColor: brand, margin: [6, 6, 6, 6], alignment: 'right' }
      ]
    ];

    (dto.lines || []).forEach(l => {
      planTableBody.push([
        { text: l.finishedItemName || l.recipeName || '', margin: [6, 6, 6, 6] },
        { text: this.fmtNum(l.plannedQty), alignment: 'right', margin: [6, 6, 6, 6] },
        { text: this.fmtNum(l.expectedOutput), alignment: 'right', margin: [6, 6, 6, 6] }
      ]);
    });

    const content: any[] = [];
    content.push(...headerBlock);

    content.push({ text: 'Plan Lines', fontSize: 13, bold: true, margin: [0, 6, 0, 6], color: brand });
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 100, 120],
        body: planTableBody
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 12]
    });

    // For each recipe line -> show ingredients table
    (dto.lines || []).forEach((l, idx) => {
      const recipeId = Number(l.recipeId || 0);
      const list = ingByRecipe.get(recipeId) || [];

      content.push({
        text: `${idx + 1}. ${l.finishedItemName || l.recipeName || 'Recipe'} - Ingredients`,
        fontSize: 12,
        bold: true,
        color: brand,
        margin: [0, 10, 0, 6]
      });

      const ingBody: any[] = [
        [
          { text: 'Ingredient', bold: true, color: 'white', fillColor: brand, margin: [6, 6, 6, 6] },
          { text: 'UOM', bold: true, color: 'white', fillColor: brand, margin: [6, 6, 6, 6] },
          { text: 'Required', bold: true, color: 'white', fillColor: brand, margin: [6, 6, 6, 6], alignment: 'right' },
          { text: 'Available', bold: true, color: 'white', fillColor: brand, margin: [6, 6, 6, 6], alignment: 'right' },
          { text: 'Status', bold: true, color: 'white', fillColor: brand, margin: [6, 6, 6, 6] }
        ]
      ];

      if (!list.length) {
        ingBody.push([
          { text: 'No ingredients found', colSpan: 5, margin: [6, 8, 6, 8], color: '#6b7280' },
          {}, {}, {}, {}
        ]);
      } else {
        list.forEach(x => {
          const ok = (x.status || '').toUpperCase() === 'OK';
          ingBody.push([
            { text: x.ingredientItemName || '', margin: [6, 6, 6, 6] },
            { text: x.uom || '', margin: [6, 6, 6, 6] },
            { text: this.fmtNum(x.requiredQty), alignment: 'right', margin: [6, 6, 6, 6] },
            { text: this.fmtNum(x.availableQty), alignment: 'right', margin: [6, 6, 6, 6] },
            {
              text: ok ? 'OK' : 'Shortage',
              bold: true,
              color: ok ? '#0f7a3a' : '#b91c1c',
              margin: [6, 6, 6, 6]
            }
          ]);
        });
      }

      content.push({
        table: {
          headerRows: 1,
          widths: ['*', 70, 90, 90, 70],
          body: ingBody
        },
        layout: 'lightHorizontalLines'
      });
    });

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [28, 22, 28, 22],
      content,
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          { text: `UnityWorks ERP`, alignment: 'left', margin: [28, 0, 0, 0], color: '#6b7280', fontSize: 9 },
          { text: `Page ${currentPage} / ${pageCount}`, alignment: 'right', margin: [0, 0, 28, 0], color: '#6b7280', fontSize: 9 }
        ]
      }),
      defaultStyle: { fontSize: 10 }
    };

    const fileName = `ProductionPlan_${h.productionPlanNo || h.id}.pdf`;
    (pdfMake as any).createPdf(docDefinition).download(fileName);
  }

  private fmtNum(v: any): string {
    const n = Number(v ?? 0);
    return (Math.round(n * 1000) / 1000).toString();
  }

  private fmtDate(iso: any): string {
    try {
      const d = new Date(iso);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = d.getFullYear();
      return `${dd}-${mm}-${yy}`;
    } catch {
      return String(iso || '');
    }
  }
}
