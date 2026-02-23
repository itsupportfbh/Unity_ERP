import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { Router, ActivatedRoute } from '@angular/router';

import {
  IngredientRowDto,
  PlanRowDto,
  ProductionPlanService,
  SoHeaderDto
} from '../production-plan.service';

import { WarehouseService } from 'app/main/master/warehouse/warehouse.service'; // ✅ adjust path if different

type WarehouseDto = { id: number; name: string };

@Component({
  selector: 'app-production-planning',
  templateUrl: './production-planning.component.html',
  styleUrls: ['./production-planning.component.scss']
})
export class ProductionPlanningComponent implements OnInit {

  // SO
  soList: SoHeaderDto[] = [];
  selectedSoId: number | null = null;

  // ✅ Warehouses
  warehouseList: WarehouseDto[] = [];
  warehouseId: number | null = null;

  // other
  outletId = 1;
  isLoading = false;

  planRows: PlanRowDto[] = [];
  ingredients: IngredientRowDto[] = [];
  shortageCountVal = 0;

  currentPlanId: number | null = null;
  isEditMode = false;

  status: number = 1; // 1 = Pending
  planDate: Date = new Date();

  disableCreateButton = false;

  constructor(
    private api: ProductionPlanService,
    private whApi: WarehouseService,     // ✅
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id') || 0);

    // ✅ Load warehouse list first (needed for dropdown)
    this.loadWarehouses(() => {
      if (id > 0) {
        this.isEditMode = true;
        this.currentPlanId = id;
        this.loadPlanById(id);
      } else {
        // create mode
        this.status = 1;
        this.setDefaultWarehouseIfNeeded();
        this.loadSalesOrders();
      }
    });
  }

  // -----------------------------
  // ✅ Warehouses
  // -----------------------------
  private loadWarehouses(done?: () => void): void {
    this.whApi.getWarehouse().subscribe({
      next: (res: any) => {
        // map to {id,name}
        this.warehouseList = (res.data || []).map(x => ({
          id: Number(x.id ?? x.Id ?? 0),
          name: String(x.name ?? x.Name ?? '')
        })).filter(x => x.id > 0);

        // if still null, set first as default
        this.setDefaultWarehouseIfNeeded();

        done?.();
      },
      error: () => {
        this.warehouseList = [];
        this.setDefaultWarehouseIfNeeded();
        done?.();
      }
    });
  }

  private setDefaultWarehouseIfNeeded(): void {
    // ✅ If already has warehouseId no need
    if (this.warehouseId && this.warehouseId > 0) return;

    // 1) try user default warehouse (if you store in localStorage)
    const userWh = Number(localStorage.getItem('defaultWarehouseId') || 0);
    if (userWh > 0) {
      this.warehouseId = userWh;
      return;
    }

    // 2) else take first warehouse from list
    if (this.warehouseList.length > 0) {
      this.warehouseId = this.warehouseList[0].id;
    } else {
      this.warehouseId = 0; // fallback
    }
  }

  onWarehouseChange(): void {
    // warehouse change → refresh preview if SO selected
    if (this.selectedSoId) {
      this.onSoChange();
    }
  }

  // -----------------------------
  // Helpers
  // -----------------------------
  private recomputeShortage(): void {
    this.shortageCountVal = (this.ingredients || []).filter(i => (i?.status || '') !== 'OK').length;
  }

  private clearScreen(): void {
    this.planRows = [];
    this.ingredients = [];
    this.shortageCountVal = 0;
    this.disableCreateButton = false;
  }

  private loadSalesOrders(includeSoId?: number): void {
    this.api.getSalesOrders(includeSoId).subscribe({
      next: (res) => (this.soList = res || []),
      error: () => Swal.fire('Error', 'Failed to load Sales Orders', 'error')
    });
  }

  // -----------------------------
  // ✅ Create-mode preview by SO
  // -----------------------------
  onSoChange(): void {
    if (!this.selectedSoId) {
      if (!this.isEditMode) this.currentPlanId = null;
      this.clearScreen();
      return;
    }

    if (!this.warehouseId) {
      Swal.fire('Select Warehouse', 'Please select Production Warehouse', 'warning');
      return;
    }

    this.isLoading = true;

    this.api.getBySo(this.selectedSoId, this.warehouseId).subscribe({
      next: (res) => {
        this.planRows = res?.planRows || [];
        this.ingredients = res?.ingredients || [];
        this.recomputeShortage();
        this.isLoading = false;
  const missing = res?.missingFinishedItems || [];

   if (missing.length > 0) {
    // (optional) remove duplicates by itemId
    const uniq = Array.from(new Map(missing.map((x: any) => [x.finishedItemId, x])).values());

    const listHtml = uniq
      .map((x: any) => `• ${x.finishedItemName} (Qty: ${this.fmt(x.plannedQty)})`)
      .join('<br/>');

    Swal.fire({
      icon: 'warning',
      title: 'RecipeHeader missing',
      html:
        `<div style="text-align:left;">
           <b>Please create RecipeHeader for below Finished Items (SupplyMethod = PP):</b><br/><br/>
           ${listHtml}
         </div>
         <br/>
         <small>After creating RecipeHeader, refresh this page to load Plan.</small>`,
      confirmButtonText: 'OK'
    });

    return; // ✅ IMPORTANT: stop here
  }
        if (!this.planRows.length) {
          Swal.fire('No Recipe', 'No recipe found for SO items.', 'warning');
        }
      },
      error: () => {
        this.isLoading = false;
        Swal.fire('Error', 'Failed to load plan', 'error');
      }
    });
  }

  refresh(): void {
    if (this.isEditMode && this.currentPlanId) {
      this.loadPlanById(this.currentPlanId);
      return;
    }
    this.onSoChange();
  }

  // -----------------------------
  // ✅ Edit-mode load by Id
  // -----------------------------
  loadPlanById(id: number): void {
    this.isLoading = true;

    this.api.getPlanById(id).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        const h = data?.header || data?.Header;

        if (!h) {
          this.isLoading = false;
          Swal.fire('Error', 'Plan not found', 'error');
          return;
        }

        this.currentPlanId = Number(h.id || h.Id || id);
        this.selectedSoId = Number(h.salesOrderId || h.SalesOrderId || 0) || null;

        // ✅ set warehouse from plan
        const wh = Number(h.warehouseId || h.WarehouseId || 0);
        if (wh > 0) this.warehouseId = wh;
        this.setDefaultWarehouseIfNeeded();

        this.outletId = Number(h.outletId || h.OutletId || this.outletId);
        this.status = Number(h.status ?? h.Status ?? 1);
        if (![0,1,2].includes(this.status)) this.status = 1;
        this.planDate = h.planDate ? new Date(h.planDate) : new Date();

        // load SO list include selected SO
        if (this.selectedSoId) this.loadSalesOrders(this.selectedSoId);
        else this.loadSalesOrders();

        // lines -> planRows
        const lines = (data?.lines || data?.Lines || []) as any[];
        this.planRows = lines.map(l => ({
          recipeId: Number(l.recipeId ?? l.RecipeId ?? 0),
          finishedItemId: Number(l.finishedItemId ?? l.FinishedItemId ?? 0),
          recipeName: String(l.finishedItemName ?? l.recipeName ?? l.RecipeName ?? ''),
          plannedQty: Number(l.plannedQty ?? l.PlannedQty ?? 0),
          expectedOutput: Number(l.expectedOutput ?? l.ExpectedOutput ?? 0),
          batchQty: 0,
          headerYieldPct: 0
        }));

        // ingredients preview for edit mode
        if (this.selectedSoId && this.warehouseId) {
          this.api.getBySo(this.selectedSoId, this.warehouseId).subscribe({
            next: (x) => {
              this.ingredients = x?.ingredients || [];
              this.recomputeShortage();
              this.isLoading = false;
            },
            error: () => {
              this.ingredients = [];
              this.recomputeShortage();
              this.isLoading = false;
            }
          });
        } else {
          this.ingredients = [];
          this.recomputeShortage();
          this.isLoading = false;
        }
      },
      error: (e) => {
        this.isLoading = false;
        Swal.fire('Error', e?.error?.message || 'Failed to load plan', 'error');
      }
    });
  }

  // -----------------------------
  // ✅ Save (Create or Update)
  // -----------------------------
 savePlan(): void {
  // if shortage exists, do not allow status=1 save
  if (this.shortageCountVal > 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Shortage Found',
      text: 'Shortage items are available. Please click Create PR.',
      confirmButtonText: 'OK'
    });
    return;
  }

  // no shortage -> Pending (1)
  this.savePlanWithStatus(1);
}

  // -----------------------------
  // PR
  // -----------------------------
  createPR(): void {
  if (this.shortageCountVal <= 0) {
    Swal.fire('No Shortage', 'No shortage items found.', 'info');
    return;
  }

  Swal.fire({
    icon: 'question',
    title: 'Create PR & Save Plan?',
    text: 'This will create PR and save Production Plan as Pending PR.',
    showCancelButton: true,
    confirmButtonText: 'Yes, Create',
    cancelButtonText: 'Cancel'
  }).then(r => {
    if (!r.isConfirmed) return;

    const payload = {
      salesOrderId: this.selectedSoId,
      warehouseId: this.warehouseId,
      outletId: this.outletId,
      userId: Number(localStorage.getItem('id') || 0),
      userName: (localStorage.getItem('username') || '').trim(),
      deliveryDate: null,
      note: `Auto from Production Planning SO:${this.selectedSoId}`
    };

    this.api.createPrFromRecipeShortage(payload).subscribe({
      next: (res) => {
        if (res?.prId > 0) {
          this.disableCreateButton = true;

          // ✅ Save plan as Pending PR (0)
          this.savePlanWithStatus(0);
        } else {
          this.disableCreateButton = false;
          Swal.fire('Info', res?.message || 'No shortage items', 'info');
        }
      },
      error: (err) => {
        Swal.fire('Error', err?.error?.message || 'Failed', 'error');
      }
    });
  });
}
  fmt(v: any): string {
    const n = Number(v ?? 0);
    return (Math.round(n * 1000) / 1000).toString();
  }

  onGoToRecipeList(): void {
    this.router.navigate(['/Recipe/productionplanninglist']);
  }
  private savePlanWithStatus(statusValue: number): void {
  if (!this.selectedSoId) return;

  if (!this.warehouseId) {
    Swal.fire('Select Warehouse', 'Please select Production Warehouse', 'warning');
    return;
  }

  const userName = (localStorage.getItem('username') || '').trim() || 'admin';

  const lines = (this.planRows || []).map(r => ({
    recipeId: Number(r.recipeId || 0),
    finishedItemId: Number(r.finishedItemId || 0),
    plannedQty: Number(r.plannedQty || 0),
    expectedOutput: Number(r.expectedOutput || 0)
  }));

  if (!lines.length) {
    Swal.fire('Info', 'No plan lines to save', 'info');
    return;
  }

  const goList = () => this.router.navigate(['/Recipe/productionplanninglist']);

  // ✅ UPDATE
  if (this.isEditMode && this.currentPlanId) {
    this.api.updatePlan({
      id: this.currentPlanId,
      salesOrderId: this.selectedSoId,
      outletId: this.outletId,
      warehouseId: this.warehouseId,
      planDate: this.planDate,
      status: statusValue,      // ✅ INT
      updatedBy: userName,
      lines
    }).subscribe({
      next: (res: any) => {
        const pid = Number(res?.productionPlanId || res?.id || this.currentPlanId || 0);
        Swal.fire('Updated', `Production Plan Id: ${pid}`, 'success')
          .then(() => goList());
      },
      error: (e) => Swal.fire('Error', e?.error?.message || 'Update failed', 'error')
    });
    return;
  }

  // ✅ CREATE (your backend must accept status OR DB default 1 will apply)
  this.api.savePlan({
    salesOrderId: this.selectedSoId,
    outletId: this.outletId,
    warehouseId: this.warehouseId,
    createdBy: userName,
    status: statusValue          // ✅ if backend not added, ignore safely
  } as any).subscribe({
    next: (res: any) => {
      const pid = Number(res?.productionPlanId || res?.id || 0);
      if (pid > 0) this.currentPlanId = pid;

      Swal.fire('Saved', `Production Plan Id: ${pid}`, 'success')
        .then(() => goList());
    },
    error: (e) => Swal.fire('Error', e?.error?.message || 'Save failed', 'error')
  });
}
}
