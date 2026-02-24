import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { Router, ActivatedRoute } from '@angular/router';
import { BatchProductionService } from '../batch-production-service';
import { ProductionPlanService } from '../../production-planning/production-plan.service';

type PlanLineDto = {
  id: number;
  productionPlanId: number;
  recipeId: number;
  finishedItemId: number;
  finishedItemName: string;
  plannedQty: number;
  expectedOutput: number;
  totalShortage?: number;
};

type ProductionPlanDto = {
  id: number;
  salesOrderId: number;
  salesOrderNo: string;
  planDate: string;
  status: string;
  createdBy: string;
  createdDate: string;
  totalShortage: number;
  productionPlanNo: string;
  lines: PlanLineDto[];
   warehouseId: number;
};

type PlanOption = {
  id: number;
  label: string;
};

type BatchLineDto = {
  recipeId: number;
  recipeName: string;
  uom?: string;
  plannedQty: number;
  actualQty: number;
  expectedOutput?: number;
  finishedItemId?: number;
};
type IngredientRowDto = {
  ingredientItemId: number;
  ingredientName: string;
  requiredQty: number;
  availableQty: number;
  status: 'OK' | 'Shortage';
};


@Component({
  selector: 'app-batch-production-create',
  templateUrl: './batch-production-create.component.html',
  styleUrls: ['./batch-production-create.component.scss']
})
export class BatchProductionCreateComponent implements OnInit {

  // dropdown options
  plans: PlanOption[] = [];

  // keep full plans (with lines)
  private planCache: ProductionPlanDto[] = [];

  selectedPlanId: number | null = null;
  isLoading = false;

  lines: BatchLineDto[] = [];

  batchId: number | null = null;
  status: string = 'Draft';

  private pendingApplySelectedPlan = false;
  selectedWarehouseId: number | null = null;
  selectedPlanNo: string | null = null;

  ingredientOpen = false;
  ingredientTitle = '';
  ingredientRows: IngredientRowDto[] = [];
  ingredientLoading = false;



  constructor(
    private api: BatchProductionService,
    private router: Router,
    private route: ActivatedRoute,
    private srv: ProductionPlanService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.batchId = id > 0 ? id : null;

    this.loadPlans();

    if (this.batchId) {
      this.loadBatch(this.batchId);
    }else {
    // ✅ Create mode: load plans normally
    this.loadPlans();
  }
  }

  get varianceCount(): number {
    return (this.lines || []).filter(x => Math.abs((x.actualQty ?? 0) - (x.plannedQty ?? 0)) > 0).length;
  }

  // =============================
  // 1) Load plans (with lines)
  // =============================
loadPlans(): void {
  this.isLoading = true;

  this.srv.getProductionPlanList().subscribe({
    next: (res: any) => {
      const raw: any[] = res?.data ?? res ?? [];
      const allPlans: ProductionPlanDto[] = Array.isArray(raw) ? raw as any : [];

      // ✅ Keep ONLY Status = 1 (but keep selected plan in edit mode even if status != 1)
      const filtered = allPlans.filter(p => {
        const st = Number((p as any).status ?? (p as any).Status ?? 0);
        const pid = Number((p as any).id ?? (p as any).Id ?? 0);

        // show only status=1
        if (st === 1) return true;

        // edit mode safety: keep the already selected plan (even if status=2)
        if (this.selectedPlanId && pid === Number(this.selectedPlanId)) return true;

        return false;
      });

      this.planCache = filtered;

      // dropdown label
      this.plans = this.planCache.map(p => ({
        id: Number((p as any).id ?? 0),
        label: `${(p as any).productionPlanNo || 'PLAN'} - ${(p as any).salesOrderNo || ''} - ${(p as any).status ?? ''}`
      }));

      this.isLoading = false;

      // if batch loaded earlier & selectedPlanId already set, apply now
      if (this.pendingApplySelectedPlan && this.selectedPlanId) {
        this.pendingApplySelectedPlan = false;
        this.applyPlanLinesFromCache(this.selectedPlanId);
      }
    },
    error: () => {
      this.isLoading = false;
      Swal.fire('Error', 'Failed to load plans', 'error');
    }
  });
}

  // =============================
  // 2) When user selects plan
  // =============================
  onPlanChange(): void {
    if (!this.selectedPlanId) {
      this.lines = [];
      return;
    }
    this.applyPlanLinesFromCache(this.selectedPlanId);
  }

 private applyPlanLinesFromCache(planId: number): void {
  const plan = (this.planCache || []).find(x => Number(x.id) === Number(planId));

  if (!plan) {
    this.lines = [];
    this.selectedWarehouseId = null;
    this.selectedPlanNo = null;
    return;
  }

  // ✅ warehouseId comes from ProductionPlan
  this.selectedWarehouseId = (plan as any).warehouseId ?? null;
  this.selectedPlanNo = (plan as any).productionPlanNo ?? null;

  const plines = plan.lines || [];
  this.lines = plines.map(l => ({
    recipeId: Number(l.recipeId || 0),
    recipeName: l.finishedItemName || '-',
    plannedQty: Number(l.plannedQty ?? 0),
    actualQty: Number(l.plannedQty ?? 0),
    expectedOutput: Number(l.expectedOutput ?? 0),
    finishedItemId: Number(l.finishedItemId ?? 0),
    uom: ''
  }));
}


  reloadPlan(): void {
    if (!this.selectedPlanId) return;
    this.applyPlanLinesFromCache(this.selectedPlanId);
  }

  // =============================
  // Edit mode load (draft)
  // =============================
 loadBatch(id: number): void {
  this.isLoading = true;

  this.api.getBatchById(id).subscribe({
    next: (res: any) => {
      // API -> { isSuccess:true, data:{ header:{...}, lines:[...] } }
      const dto = res?.data ?? {};

      const header = dto?.header ?? dto?.Header ?? null;
      const lines = dto?.lines ?? dto?.Lines ?? [];

      // ---------- Header ----------
      this.status = header?.status || header?.Status || 'Draft';

      // IMPORTANT: backend uses ProductionPlanId, NOT planId
      this.selectedPlanId = Number(header?.productionPlanId ?? header?.ProductionPlanId ?? 0) || null;

      // warehouse is already stored in batch header
      this.selectedWarehouseId = Number(header?.warehouseId ?? header?.WarehouseId ?? 0) || null;
       this.loadPlans();
      // optional display
      this.selectedPlanNo = header?.batchNo || header?.BatchNo || null;

      // ---------- Lines ----------
      this.lines = (Array.isArray(lines) ? lines : []).map((x: any) => ({
        recipeId: Number(x.recipeId ?? x.RecipeId ?? 0),
        recipeName: x.finishedItemName || x.FinishedItemName || x.recipeName || x.RecipeName || '-',
        uom: x.uom || x.uomName || x.Uom || x.UomName || '',
        plannedQty: Number(x.plannedQty ?? x.PlannedQty ?? 0),
        actualQty: Number(x.actualQty ?? x.ActualQty ?? 0),
        expectedOutput: Number(x.expectedOutput ?? x.ExpectedOutput ?? 0),
        finishedItemId: Number(x.finishedItemId ?? x.FinishedItemId ?? 0) || undefined
      }));

      this.isLoading = false;

      // If batch lines missing, fallback load from selected plan (optional)
      if ((!this.lines || this.lines.length === 0) && this.selectedPlanId) {
        if (this.planCache.length) {
          this.applyPlanLinesFromCache(this.selectedPlanId);
        } else {
          this.pendingApplySelectedPlan = true;
        }
      }
    },
    error: (e) => {
      console.error(e);
      this.isLoading = false;
      Swal.fire('Error', 'Failed to load batch', 'error');
    }
  });
}


  onActualChange(index: number, value: any): void {
    const n = Number(value ?? 0);
    this.lines[index].actualQty = isNaN(n) ? 0 : n;
  }

canPost(): boolean {
  if (this.isLoading) return false;
  if (!this.selectedPlanId) return false;
  if (!this.lines.length) return false;
  if ((this.status || '').toLowerCase() === 'posted') return false;
  return true;
}


  cancel(): void {
  this.router.navigateByUrl('/Recipe/batchproductionlist')
}

postToInventory(): void {
  if (!this.selectedPlanId || !this.lines.length) return;

  if (!this.selectedWarehouseId) {
    Swal.fire('Error', 'WarehouseId not found in selected production plan', 'error');
    return;
  }

  Swal.fire({
    title: 'Post & Save?',
    text: 'This will save the batch and reduce ingredient stock.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, post'
  }).then(r => {
    if (!r.isConfirmed) return;

    const user = (localStorage.getItem('username') || 'admin').trim();

    const payload = {
      id: this.batchId, // null => create, else update
      productionPlanId: this.selectedPlanId,
      warehouseId: this.selectedWarehouseId,
      batchNo: null,
      status: 'Posted',
      user,
      lines: this.lines.map(x => ({
        recipeId: x.recipeId,
        finishedItemId: x.finishedItemId ?? null,
        plannedQty: x.plannedQty,
        actualQty: x.actualQty
      }))
    };

    this.isLoading = true;

    this.api.postAndSave(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;

        const newId = Number(res?.batchId || res?.id || 0);
        if (newId > 0) this.batchId = newId;

        this.status = 'Posted';
        Swal.fire('Posted', 'Batch saved and inventory updated', 'success');

        // optional: redirect
        this.router.navigate(['/Recipe/batchproductionlist']);
      },
      error: (e) => {
        this.isLoading = false;
        console.error(e);
        Swal.fire('Error', e?.error?.message || 'Post failed', 'error');
      }
    });
  });
  
}



 
  getVarClass(r: BatchLineDto): string {
    const v = (r.actualQty ?? 0) - (r.plannedQty ?? 0);
    if (v === 0) return 'ok';
    if (v < 0) return 'neg';
    return 'pos';
  }

  fmt(v: any): string {
    const n = Number(v ?? 0);
    const x = Math.round(n * 1000) / 1000;
    return x.toString();
  }

  openIngredients(row: BatchLineDto): void {
  if (!row?.recipeId) return;

  if (!this.selectedWarehouseId) {
    Swal.fire('Error', 'Warehouse not selected', 'error');
    return;
  }

  const qty = Number(row.actualQty ?? 0);
  this.ingredientTitle = row.recipeName || 'Ingredients';
  this.ingredientOpen = true;
  this.ingredientLoading = true;
  this.ingredientRows = [];

  // call API
  this.api.getIngredientExplosion(row.recipeId, this.selectedWarehouseId, qty).subscribe({
    next: (res: any) => {
      this.ingredientLoading = false;
      this.ingredientRows = (res?.data ?? []).map((x: any) => ({
        ingredientItemId: Number(x.ingredientItemId ?? 0),
        ingredientName: x.ingredientName || '-',
        requiredQty: Number(x.requiredQty ?? 0),
        availableQty: Number(x.availableQty ?? 0),
        status: (x.status === 'Shortage' ? 'Shortage' : 'OK')
      }));
    },
    error: (e) => {
      this.ingredientLoading = false;
      console.error(e);
      Swal.fire('Error', 'Failed to load ingredient explosion', 'error');
    }
  });
}

closeIngredients(): void {
  this.ingredientOpen = false;
}

}
