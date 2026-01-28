import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemMasterService } from 'app/main/inventory/item-master/item-master.service';
import { RecipemasterserviceService } from '../recipemasterservice.service';
import Swal from 'sweetalert2';

interface ItemDto {
  id: number;
  itemCode: string;
  itemName: string;
  itemTypeId: any;
  uomName?: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-recipemastercreate',
  templateUrl: './recipemastercreate.component.html',
  styleUrls: ['./recipemastercreate.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class RecipemastercreateComponent implements OnInit {

  step = 1;

  form!: FormGroup;
  lineForm!: FormGroup;

  Itemlist: ItemDto[] = [];
  finishedFoods: ItemDto[] = [];
  rawMaterials: ItemDto[] = [];

  selectedFinished: ItemDto | null = null;

  bomLines: any[] = [];

  showLineModal = false;
  editingIndex: number | null = null;

  totalCost = 0;
  isSaving = false;

  // ✅ EDIT
  isEdit = false;
  recipeId: number | null = null;

  // ✅ Item Type Ids
  FINISHED_FOODS_TYPE_ID = 1;
  RAW_MATERIAL_TYPE_ID = 2;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private itemSrv: ItemMasterService,
    private recipeSrv: RecipemasterserviceService
  ) {}

  ngOnInit(): void {
    // ✅ detect edit from route param
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : 0;
    this.recipeId = id > 0 ? id : null;
    this.isEdit = !!this.recipeId;

    // forms
    this.form = this.fb.group({
      code: [{ value: this.generateCode(), disabled: true }], // readonly
      finishedItemId: ['', Validators.required],
      cuisine: [''],
      status: ['Active'],
      notes: ['']
    });

    this.lineForm = this.fb.group({
      ingredientItemId: ['', Validators.required],
      ingredientName: [''],
      qty: [0, [Validators.required, Validators.min(0)]],
      uomName: [''],
      yieldPct: [100, [Validators.min(0), Validators.max(100)]],
      unitCost: [0, [Validators.min(0)]],
      remarks: ['']
    });

    this.loadMasterItem();
  }

  // ---------------- helper ----------------
  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  goStep(n: number): void {
    if (n === 2) {
      this.form.markAllAsTouched();
      if (this.form.invalid) return;
    }
    this.step = n;
  }

  cancel(): void {
    this.router.navigate(['/production/recipe-master']);
  }

  // ---------------- Item master ----------------
  loadMasterItem(): void {
    this.itemSrv.getAllItemMaster().subscribe({
      next: (res: any) => {
        this.Itemlist = Array.isArray(res?.data) ? res.data : [];

        this.finishedFoods = this.Itemlist.filter(x =>
          x?.isActive === true && Number(x?.itemTypeId) === Number(this.FINISHED_FOODS_TYPE_ID)
        );

        this.rawMaterials = this.Itemlist.filter(x =>
          x?.isActive === true && Number(x?.itemTypeId) === Number(this.RAW_MATERIAL_TYPE_ID)
        );

        // ✅ after dropdown loaded, load edit dto
        if (this.isEdit && this.recipeId) {
          this.loadRecipeForEdit(this.recipeId);
        }
      },
      error: (e) => console.error(e)
    });
  }

  onFinishedItemChanged(): void {
    const id = Number(this.form.get('finishedItemId')?.value || 0);
    this.selectedFinished = this.finishedFoods.find(x => Number(x.id) === id) || null;
  }

  // ---------------- Code ----------------
  private generateCode(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `RECIPESEQ_${y}${m}${day}`;
    const seqNum = (Number(localStorage.getItem(key) || '0') + 1);
    localStorage.setItem(key, String(seqNum));
    return `REC-${y}${m}${day}-${String(seqNum).padStart(3, '0')}`;
  }

  // ---------------- Load Recipe for Edit ----------------
  private loadRecipeForEdit(id: number): void {
    this.recipeSrv.getRecipeById(id).subscribe({
      next: (res: any) => {
        const dto = res?.data ?? res ?? {};
        if (!dto) return;

        // if backend has code, show it
        if (dto?.code) {
          this.form.get('code')?.setValue(dto.code, { emitEvent: false });
        }

        this.form.patchValue({
          finishedItemId: dto.finishedItemId ?? '',
          cuisine: dto.cuisine ?? '',
          status: dto.status ?? 'Draft',
          notes: dto.notes ?? ''
        }, { emitEvent: false });

        // update selected finished
        const fid = Number(dto.finishedItemId || 0);
        this.selectedFinished = this.finishedFoods.find(x => Number(x.id) === fid) || null;

        const lines = Array.isArray(dto.ingredients) ? dto.ingredients : [];
        this.bomLines = lines.map((l: any) => {
          const rm = this.rawMaterials.find(x => Number(x.id) === Number(l.ingredientItemId));
          const qty = Number(l.qty ?? 0);
          const yieldPct = Number(l.yieldPct ?? 100);
          const unitCost = Number(l.unitCost ?? 0);

          return {
            ingredientItemId: Number(l.ingredientItemId),
            ingredientName: l.ingredientItemName ?? rm?.itemName ?? '',
            qty,
            uomName: l.uom ?? l.uomName ?? l.ingredientUomName ?? rm?.uomName ?? '',
            yieldPct,
            unitCost,
            remarks: l.remarks ?? '',
            rowCost: Number(l.rowCost ?? this.calcRowCost(qty, yieldPct, unitCost))
          };
        });

        this.recomputeTotal();
      },
      error: (e: any) => {
        console.error(e);
        alert(e?.error?.message || 'Failed to load recipe');
      }
    });
  }

  // ---------------- Modal ----------------
  openLineModal(editIndex?: number): void {
    this.editingIndex = (typeof editIndex === 'number') ? editIndex : null;

    if (this.editingIndex !== null) {
      const l = this.bomLines[this.editingIndex];
      this.lineForm.reset({
        ingredientItemId: l.ingredientItemId,
        ingredientName: l.ingredientName,
        qty: l.qty,
        uomName: l.uomName,
        yieldPct: l.yieldPct,
        unitCost: l.unitCost,
        remarks: l.remarks || ''
      });
    } else {
      this.lineForm.reset({
        ingredientItemId: '',
        ingredientName: '',
        qty: 0,
        uomName: '',
        yieldPct: 100,
        unitCost: 0,
        remarks: ''
      });
    }

    this.showLineModal = true;
  }

  closeLineModal(): void {
    this.showLineModal = false;
    this.editingIndex = null;
  }

  onLineItemChanged(): void {
    const id = Number(this.lineForm.get('ingredientItemId')?.value || 0);
    const item = this.rawMaterials.find(x => Number(x.id) === id);

    this.lineForm.patchValue({
      ingredientName: item?.itemName ?? '',
      uomName: item?.uomName ?? ''
    }, { emitEvent: false });
  }

  private calcRowCost(qty: number, yieldPct: number, unitCost: number): number {
    const y = Math.max(Math.min(Number(yieldPct || 0), 100), 0);
    const reqQty = y > 0 ? (Number(qty || 0) / (y / 100)) : Number(qty || 0);
    return reqQty * Number(unitCost || 0);
  }

  private recomputeTotal(): void {
    this.totalCost = this.bomLines.reduce((s, r) => s + Number(r.rowCost || 0), 0);
  }

  addAndClose(): void {
    this.lineForm.markAllAsTouched();
    if (this.lineForm.invalid) return;

    const v = this.lineForm.getRawValue();
    const rowCost = this.calcRowCost(v.qty, v.yieldPct, v.unitCost);

    const line = {
      ingredientItemId: Number(v.ingredientItemId),
      ingredientName: v.ingredientName,
      qty: Number(v.qty),
      uomName: v.uomName,
      yieldPct: Number(v.yieldPct),
      unitCost: Number(v.unitCost),
      remarks: v.remarks,
      rowCost
    };

    if (this.editingIndex !== null) this.bomLines[this.editingIndex] = line;
    else this.bomLines.push(line);

    this.recomputeTotal();
    this.closeLineModal();
  }

  addAnother(): void {
    this.lineForm.markAllAsTouched();
    if (this.lineForm.invalid) return;

    // add and keep modal open
    const v = this.lineForm.getRawValue();
    const rowCost = this.calcRowCost(v.qty, v.yieldPct, v.unitCost);

    const line = {
      ingredientItemId: Number(v.ingredientItemId),
      ingredientName: v.ingredientName,
      qty: Number(v.qty),
      uomName: v.uomName,
      yieldPct: Number(v.yieldPct),
      unitCost: Number(v.unitCost),
      remarks: v.remarks,
      rowCost
    };

    if (this.editingIndex !== null) this.bomLines[this.editingIndex] = line;
    else this.bomLines.push(line);

    this.recomputeTotal();

    // reset for next
    this.editingIndex = null;
    this.lineForm.reset({
      ingredientItemId: '',
      ingredientName: '',
      qty: 0,
      uomName: '',
      yieldPct: 100,
      unitCost: 0,
      remarks: ''
    });
  }

  deleteLine(i: number): void {
    this.bomLines.splice(i, 1);
    this.recomputeTotal();
  }

submit(): void {
  this.form.markAllAsTouched();
  if (this.form.invalid) return;

  if (this.bomLines.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Missing Ingredients',
      text: 'Please add at least 1 ingredient line'
    });
    this.step = 2;
    return;
  }

  const header = this.form.getRawValue();

  const payload = {
    code: header.code,
    finishedItemId: Number(header.finishedItemId),
    cuisine: header.cuisine,
    status: header.status,
    notes: header.notes,
    ingredients: this.bomLines.map(l => ({
      ingredientItemId: l.ingredientItemId,
      qty: l.qty,
      uom: l.uomName,
      yieldPct: l.yieldPct,
      unitCost: l.unitCost,
      remarks: l.remarks
    }))
  };

  this.isSaving = true;

  const api$ = (this.isEdit && this.recipeId)
    ? this.recipeSrv.updateRecipe(this.recipeId, payload)
    : this.recipeSrv.createRecipe(payload);

  api$.subscribe({
    next: () => {
      this.isSaving = false;

      Swal.fire({
        icon: 'success',
        title: this.isEdit ? 'Recipe Updated' : 'Recipe Created',
        timer: 1200,
        showConfirmButton: false
      }).then(() => {
        this.router.navigate(['/Recipe/recipelist']);
      });
    },

    error: (e) => {
      this.isSaving = false;
      console.error(e);

      const msg =
        e?.error?.message ||
        e?.error?.Message ||
        'Save failed';

      // 🔴 DUPLICATE RECIPE MESSAGE
      Swal.fire({
        icon: 'error',
        title: 'Cannot Save Recipe',
        text: msg,
        confirmButtonColor: '#0e3a4c'
      });
    }
  });
}


  onGoToRecipeList(): void {
    this.router.navigate(['/Recipe/recipelist']);
  }
}
