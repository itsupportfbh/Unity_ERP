import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { Router, ActivatedRoute } from '@angular/router';
import { BatchProductionService } from '../batch-production-service';

interface PlanDto {
  id: number;
  planName: string;
}

interface BatchLineDto {
  recipeId: number;
  recipeName: string;
  uom?: string;
  plannedQty: number;
  actualQty: number;
}

@Component({
  selector: 'app-batch-production-create',
  templateUrl: './batch-production-create.component.html',
  styleUrls: ['./batch-production-create.component.scss']
})
export class BatchProductionCreateComponent implements OnInit {
  plans: PlanDto[] = [];
  selectedPlanId: number | null = null;

  isLoading = false;

  // execution lines
  lines: BatchLineDto[] = [];

  // if edit mode
  batchId: number | null = null;
  status: string = 'Draft';

  constructor(
    private api: BatchProductionService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // optional: /edit/:id
    const id = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.batchId = id > 0 ? id : null;

    this.loadPlans();

    if (this.batchId) {
      this.loadBatch(this.batchId);
    }
  }

  get varianceCount(): number {
    return (this.lines || []).filter(x => Math.abs(((x.actualQty ?? 0) - (x.plannedQty ?? 0))) > 0).length;
  }

  loadPlans(): void {
    // API: list plans for dropdown
    this.api.listPlans().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res ?? [];
        this.plans = Array.isArray(data) ? data : [];
      },
      error: () => Swal.fire('Error', 'Failed to load plans', 'error')
    });
  }

  loadBatch(id: number): void {
    this.isLoading = true;
    this.api.getBatchById(id).subscribe({
      next: (res: any) => {
        const dto = res?.data ?? res ?? {};
        this.status = dto?.status || 'Draft';
        this.selectedPlanId = dto?.planId ?? null;

        const l = dto?.lines ?? dto?.batchLines ?? [];
        this.lines = (l || []).map((x: any) => ({
          recipeId: Number(x.recipeId || 0),
          recipeName: x.recipeName || x.finishedItemName || '-',
          uom: x.uom || x.uomName || '',
          plannedQty: Number(x.plannedQty ?? 0),
          actualQty: Number(x.actualQty ?? 0)
        }));

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        Swal.fire('Error', 'Failed to load batch', 'error');
      }
    });
  }

  onPlanChange(): void {
    if (!this.selectedPlanId) {
      this.lines = [];
      return;
    }

    this.isLoading = true;

    // API: get plan recipes for execution table
    this.api.getPlanLines(this.selectedPlanId).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res ?? [];
        this.lines = (Array.isArray(data) ? data : []).map((x: any) => ({
          recipeId: Number(x.recipeId || x.id || 0),
          recipeName: x.recipeName || x.finishedItemName || '-',
          uom: x.uom || x.uomName || '',
          plannedQty: Number(x.plannedQty ?? x.qty ?? 0),
          actualQty: Number(x.actualQty ?? (x.plannedQty ?? x.qty ?? 0)) // default = planned
        }));
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        Swal.fire('Error', 'Failed to load plan lines', 'error');
      }
    });
  }

  reloadPlan(): void {
    if (!this.selectedPlanId) return;
    this.onPlanChange();
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

  saveDraft(): void {
    if (!this.selectedPlanId || !this.lines.length) return;

    const payload = {
      id: this.batchId,
      planId: this.selectedPlanId,
      status: 'Draft',
      createdBy: (localStorage.getItem('username') || 'admin').trim(),
      lines: this.lines.map(x => ({
        recipeId: x.recipeId,
        plannedQty: x.plannedQty,
        actualQty: x.actualQty
      }))
    };

    this.api.saveBatchDraft(payload).subscribe({
      next: (res: any) => {
        const newId = Number(res?.id || res?.batchId || 0);
        if (newId > 0 && !this.batchId) {
          this.batchId = newId;
        }
        this.status = 'Draft';
        Swal.fire('Saved', 'Draft saved', 'success');
      },
      error: () => Swal.fire('Error', 'Save failed', 'error')
    });
  }

  postToInventory(): void {
    if (!this.canPost()) return;

    Swal.fire({
      title: 'Post & Save?',
      text: 'This will update inventory stock.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, post'
    }).then(r => {
      if (!r.isConfirmed) return;

      const payload = {
        id: this.batchId,
        planId: this.selectedPlanId,
        status: 'Posted',
        postedBy: (localStorage.getItem('username') || 'admin').trim(),
        lines: this.lines.map(x => ({
          recipeId: x.recipeId,
          plannedQty: x.plannedQty,
          actualQty: x.actualQty
        }))
      };

      this.api.postBatchToInventory(payload).subscribe({
        next: () => {
          this.status = 'Posted';
          Swal.fire('Posted', 'Inventory updated', 'success');
          this.router.navigate(['/BatchProduction/list']); // adjust route
        },
        error: () => Swal.fire('Error', 'Post failed', 'error')
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

}





