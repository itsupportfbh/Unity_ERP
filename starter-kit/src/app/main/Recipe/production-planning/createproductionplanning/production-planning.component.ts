// production-planning.component.ts  ✅ FULL (Create + Edit mode)
// - Create mode: select SO -> preview planRows + ingredients -> Save (create)
// - Edit mode: if route has :id -> load plan by id -> show same UI -> Save (update)
// - Delete works in edit mode too

import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IngredientRowDto,
  PlanRowDto,
  ProductionPlanService,
  SoHeaderDto
} from '../production-plan.service';

@Component({
  selector: 'app-production-planning',
  templateUrl: './production-planning.component.html',
  styleUrls: ['./production-planning.component.scss']
})
export class ProductionPlanningComponent implements OnInit {
  soList: SoHeaderDto[] = [];
  selectedSoId: number | null = null;

  warehouseId = 1;
  outletId = 1;

  isLoading = false;

  planRows: PlanRowDto[] = [];
  ingredients: IngredientRowDto[] = [];

  shortageCountVal = 0;
  currentPlanId: number | null = null;

  // ✅ edit mode
  isEditMode = false;

  // optional fields if you want
  status = 'Draft';
  planDate: Date = new Date();
  disableCreateButton: boolean;

  constructor(
    private api: ProductionPlanService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

 ngOnInit(): void {
  const id = Number(this.route.snapshot.paramMap.get('id') || 0);

  if (id > 0) {
    this.isEditMode = true;
    this.currentPlanId = id;
    this.loadPlanById(id);          // load plan -> then loadSalesOrders(includeSoId)
  } else {
    this.loadSalesOrders();         // create mode normal
  }
}


  // -----------------------------
  // Helpers
  // -----------------------------
  private recomputeShortage(): void {
    this.shortageCountVal = (this.ingredients || []).filter(i => (i?.status || '') !== 'OK').length;
  }

private loadSalesOrders(includeSoId?: number): void {
  this.api.getSalesOrders(includeSoId).subscribe({
    next: (res) => (this.soList = res || []),
    error: () => Swal.fire('Error', 'Failed to load Sales Orders', 'error')
  });
}


  private clearScreen(): void {
    this.planRows = [];
    this.ingredients = [];
    this.shortageCountVal = 0;
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

    this.isLoading = true;

    // preview only (does not return productionPlanId)
    this.api.getBySo(this.selectedSoId, this.warehouseId).subscribe({
      next: (res) => {
        this.planRows = res?.planRows || [];
        this.ingredients = res?.ingredients || [];
        this.recomputeShortage();
        this.isLoading = false;

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
    // In edit mode, refresh should reload current plan from DB
    if (this.isEditMode && this.currentPlanId) {
      this.loadPlanById(this.currentPlanId);
      return;
    }
    // In create mode, refresh is preview by SO
    this.onSoChange();
  }

  // -----------------------------
  // ✅ Edit-mode load by Id
  // expects API: GET /ProductionPlan/{id}
  // return: { isSuccess:true, data:{ header:{...}, lines:[...] } }
  // -----------------------------
  loadPlanById(id: number): void {
    debugger
    this.isLoading = true;

    this.api.getPlanById(id).subscribe({
      next: (res: any) => {
        const data = res?.data || res; // support if backend returns direct dto
        const h = data?.header || data?.Header;

        if (!h) {
          this.isLoading = false;
          Swal.fire('Error', 'Plan not found', 'error');
          return;
        }

        this.currentPlanId = Number(h.id || h.Id || id);
        this.selectedSoId = Number(h.salesOrderId || h.SalesOrderId || 0) || null;
        if (this.selectedSoId) {
  this.loadSalesOrders(this.selectedSoId);
} else {
  this.loadSalesOrders();
}
        this.outletId = Number(h.outletId || h.OutletId || this.outletId);
        this.warehouseId = Number(h.warehouseId || h.WarehouseId || this.warehouseId);
        this.status = String(h.status || h.Status || 'Draft');
        this.planDate = h.planDate ? new Date(h.planDate) : new Date();

        const lines = (data?.lines || data?.Lines || []) as any[];

        // map lines -> planRows (same UI)
        this.planRows = lines.map(l => ({
          recipeId: Number(l.recipeId ?? l.RecipeId ?? 0),
          finishedItemId: Number(l.finishedItemId ?? l.FinishedItemId ?? 0),
          recipeName: String(l.finishedItemName ?? l.recipeName ?? l.RecipeName ?? ''),
          plannedQty: Number(l.plannedQty ?? l.PlannedQty ?? 0),
          expectedOutput: Number(l.expectedOutput ?? l.ExpectedOutput ?? 0),
          batchQty: 0,
          headerYieldPct: 0
        }));

        // if you want ingredients also in edit mode:
        // - either call getBySo again using selectedSoId
        // - or make backend return ingredients too
        // For now: we recompute ingredients from current SO preview (optional)
        if (this.selectedSoId) {
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
    if (!this.selectedSoId) return;

    const userName = (localStorage.getItem('username') || '').trim() || 'admin';

    // build lines payload from planRows
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

    // ✅ UPDATE (Edit mode OR already has planId)
    if (this.isEditMode && this.currentPlanId) {
      this.api.updatePlan({
        id: this.currentPlanId,
        salesOrderId: this.selectedSoId,
        outletId: this.outletId,
        warehouseId: this.warehouseId,
        planDate: this.planDate,
        status: this.status || 'Draft',
        updatedBy: userName,
        lines
      }).subscribe({
        next: (res: any) => {
          const pid = Number(res?.productionPlanId || res?.id || this.currentPlanId || 0);
          Swal.fire('Updated', `Production Plan Id: ${pid}`, 'success');
        },
        error: (e) => Swal.fire('Error', e?.error?.message || 'Update failed', 'error')
      });
      return;
    }

    // ✅ CREATE
    this.api.savePlan({
      salesOrderId: this.selectedSoId,
      outletId: this.outletId,
      warehouseId: this.warehouseId,
      createdBy: userName
    }).subscribe({
      next: (res: any) => {
        const pid = Number(res?.productionPlanId || res?.id || 0);
        if (pid > 0) {
          this.currentPlanId = pid;
          // optional: switch to edit mode after save
          // this.isEditMode = true;
        }
        Swal.fire('Saved', `Production Plan Id: ${pid}`, 'success');
      },
      error: () => Swal.fire('Error', 'Save failed', 'error')
    });
  }

  // -----------------------------
  // ✅ Edit button (navigate)
  // -----------------------------
  editPlan(): void {
    if (!this.currentPlanId) {
      Swal.fire('Info', 'Please save the plan first (no Plan Id).', 'info');
      return;
    }
    this.router.navigate(['/Recipe/productionplanningedit', this.currentPlanId]);
  }

  // -----------------------------
  // ✅ Delete (uses api.deletePlan)
  // -----------------------------
  deletePlan(): void {
    if (!this.currentPlanId) {
      Swal.fire('Info', 'No saved plan to delete.', 'info');
      return;
    }

    Swal.fire({
      title: 'Delete Plan?',
      text: `Plan Id: ${this.currentPlanId}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete'
    }).then(r => {
      if (!r.isConfirmed) return;

      this.api.deletePlan(this.currentPlanId!).subscribe({
        next: () => {
          Swal.fire('Deleted', 'Production plan deleted', 'success');

          // if edit screen, go back to list
          if (this.isEditMode) {
            this.router.navigate(['/Recipe/productionplanninglist']); // adjust route
            return;
          }

          // else clear screen
          this.currentPlanId = null;
          this.selectedSoId = null;
          this.clearScreen();
        },
        error: (e) => Swal.fire('Error', e?.error?.message || 'Delete failed', 'error')
      });
    });
  }

  createPR() {
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
        this.disableCreateButton = true
        Swal.fire('Success', `PR created. PR Id: ${res.prId}`, 'success');
      } else {
        this.disableCreateButton = false
        Swal.fire('Info', res?.message || 'No shortage items', 'info');
      }
    },
    error: (err) => {
      Swal.fire('Error', err?.error?.message || 'Failed', 'error');
    }
  });
}
 
 

  fmt(v: any): string {
    const n = Number(v ?? 0);
    return (Math.round(n * 1000) / 1000).toString();
  }
   onGoToRecipeList(): void {
    this.router.navigate(['/Recipe/productionplanninglist']);
  }
}
