import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ChartofaccountService } from '../chartofaccount.service';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';

@Component({
  selector: 'app-chartofaccountcreate',
  templateUrl: './chartofaccountcreate.component.html',
  styleUrls: ['./chartofaccountcreate.component.scss']
})
export class ChartOfAccountCreateComponent implements OnInit, OnChanges {
  @Output() onDepartmentChange = new EventEmitter<any>();
  @Input() editId: number | null = null; // used by sidebar flow

  addForm!: FormGroup;
  isEditMode = false;

  /** used by routed flow (/edit/:id) */
  private chartOfAccountId: number | null = null;

  // full COA list from backend
  accountHeads: any[] = [];

  // used for Parent Head dropdown / datalist
  parentHeadList: Array<{ value: number; label: string }> = [];
  selectedParentHeadLabel = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private chartOfAccountService: ChartofaccountService,
    private _coreSidebarService: CoreSidebarService
  ) {}

  // ---------------- Lifecycle ----------------
  ngOnInit(): void {
    this.initForm();
    this.loadAccountHeads();

    // Routed flow support (if you navigate to /edit/:id)
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      this.chartOfAccountId = idParam ? parseInt(idParam, 10) : null;
      this.resolveModeAndLoad();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When parent sets [editId] (sidebar flow), re-evaluate mode & load
    if ('editId' in changes && !changes['editId']?.firstChange) {
      this.resolveModeAndLoad();
    }
  }

  // ---------------- Init helpers ----------------
  private initForm(): void {
    this.addForm = this.fb.group({
      headName: [null, Validators.required],
      headCode: [{ value: null, disabled: true }],
      parentHead: [0], // stores PARENT HEAD CODE
      pHeadName: [{ value: null, disabled: true }],
      headLevel: [{ value: null, disabled: true }],
      headType: [{ value: null, disabled: true }],
      isTransaction: [false],
      isGI: [false],
      headCodeName: [null]
    });
  }

  /** Decide whether we’re in edit/create based on editId (sidebar) or chartOfAccountId (route) */
  private resolveModeAndLoad(): void {
    const effectiveId = this.editId ?? this.chartOfAccountId;

    if (effectiveId) {
      this.isEditMode = true;
      this.loadById(effectiveId);
    } else {
      this.isEditMode = false;
      this.enterCreateDefaults();
    }
  }

  private loadById(id: number): void {
    if (!this.addForm) return;

    this.chartOfAccountService.getByIdChartOfAccount(id).subscribe({
      next: (res: any) => {
        const d = res?.data || {};
        this.addForm.patchValue({
          headName: d.headName ?? null,
          headCode: d.headCode ?? null,
          parentHead: d.parentHead ?? 0, // PARENT HEAD CODE
          pHeadName: d.pHeadName ?? null,
          headLevel: d.headLevel ?? null,
          headType: d.headType ?? null,
          isTransaction: !!d.isTransaction,
          isGI: !!d.isGI,
          headCodeName: d.headCodeName ?? null
        });

        // try to sync label (in case parentHeadList is already loaded)
        this.syncSelectedParentHeadLabel();
      },
      error: err =>
        this.alert('error', 'Failed to load record', this.errMsg(err))
    });
  }

  enterCreateDefaults(): void {
    if (!this.addForm) return;
    this.addForm.reset({
      headName: null,
      headCode: null,
      parentHead: 0,
      pHeadName: null,
      headLevel: null,
      headType: null,
      isTransaction: false,
      isGI: false,
      headCodeName: null
    });
    this.selectedParentHeadLabel = '';
  }

  toggleModal(name: string): void {
    const sidebar = this._coreSidebarService.getSidebarRegistry(name);
    sidebar.toggleOpen();

    // If closing, reset the form
    if (!sidebar.open) {
      this.enterCreateDefaults();
    }
  }

  public resetForm(): void {
    if (!this.addForm) return;
    this.enterCreateDefaults();
    this.isEditMode = false;
    this.chartOfAccountId = null;
  }

  // ---------------- Load COA / Parent Heads ----------------
  loadAccountHeads(): void {
    this.chartOfAccountService.getAllChartOfAccount().subscribe((res: any) => {
      const data = (res?.data || []).filter((x: any) => x.isActive === true);

      this.accountHeads = data;

      // value = HEAD CODE (since parentHead in DB is parent headCode)
      this.parentHeadList = data.map((head: any) => ({
        value: Number(head.headCode),
        label: this.buildFullPath(head, data)
      }));

      this.syncSelectedParentHeadLabel();
    });
  }

  private syncSelectedParentHeadLabel(): void {
    if (!this.addForm) return;
    const parentCode = Number(this.addForm.get('parentHead')?.value || 0);
    if (!parentCode) {
      this.selectedParentHeadLabel = '';
      return;
    }
    const match = this.parentHeadList.find(
      h => Number(h.value) === parentCode
    );
    this.selectedParentHeadLabel = match ? match.label : '';
  }

  private buildFullPath(item: any, all: any[]): string {
    let path = item.headName;
    // ParentHead in DB is parent HEAD CODE
    let current = all.find((x: any) => x.headCode === item.parentHead);

    while (current) {
      path = `${current.headName} >> ${path}`;
      current = all.find((x: any) => x.headCode === current.parentHead);
    }

    return path;
  }

  // ---------------- Auto values ----------------

  /** For TOP-LEVEL nodes (no Parent Head) when user types Head Name */
  onChangeHeadName(_: any): void {
    const parentCode = Number(this.addForm.get('parentHead')?.value || 0);
    if (parentCode !== 0) return; // child node → ignore here
    this.applyTopLevelDefaults();
  }

  /** common logic for top-level generation */
  private applyTopLevelDefaults(): void {
    const levelOneItems = this.accountHeads.filter(
      (i: any) => Number(i.headLevel) === 1
    );
    const nextCode = (levelOneItems?.length || 0) + 1;

    this.addForm.patchValue({
      pHeadName: 'COA',
      headLevel: 1,
      headType: 'A',
      headCode: nextCode,
      isTransaction: false,
      isGI: false,
      headCodeName: null
    });
  }

  /**
   * Called when user types / chooses a Parent Head from the single input (with datalist)
   */
  onParentHeadInput(label: string): void {
    this.selectedParentHeadLabel = label || '';

    const trimmed = (label || '').trim().toLowerCase();

    // clear selection → go back to top level defaults
    if (!trimmed) {
      this.addForm.patchValue({ parentHead: 0 });
      this.applyTopLevelDefaults();
      return;
    }

    // find parent by label
    const selected = this.parentHeadList.find(
      h => h.label.toLowerCase() === trimmed
    );

    if (!selected) {
      // user typed something not exactly matching any label → do nothing
      return;
    }

    const parentCode = Number(selected.value || 0);
    this.addForm.patchValue({ parentHead: parentCode });
    this.applyParentHeadSelection(parentCode);
  }

  /** common logic to compute child HeadCode / level / type from parentCode */
  private applyParentHeadSelection(parentCode: number): void {
    if (!parentCode) {
      this.applyTopLevelDefaults();
      return;
    }

    const parent = this.accountHeads.find(
      (p: any) => Number(p.headCode) === parentCode
    );
    if (!parent) return;

    const parentCodeStr = String(parent.headCode ?? '');
    const parentLevel = Number(parent.headLevel);

    // all existing children one level below parent
    const childCodes: string[] = this.accountHeads
      .filter(
        (acc: any) =>
          String(acc.headCode ?? '').startsWith(parentCodeStr) &&
          Number(acc.headLevel) === parentLevel + 1
      )
      .map((acc: any) => String(acc.headCode ?? ''));

    // calculate next sequence
    const suffixes = childCodes
      .map(code =>
        parseInt(code.substring(parentCodeStr.length) || '0', 10)
      )
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);

    const nextSeq = suffixes.length ? suffixes[suffixes.length - 1] + 1 : 1;

    // decide padding length (at least 2 digits)
    const maxSuffixLen = Math.max(
      2,
      ...childCodes.map(code =>
        Math.max(0, code.length - parentCodeStr.length)
      )
    );
    const seqStr = String(nextSeq).padStart(maxSuffixLen, '0');
    const newHeadCode = parentCodeStr + seqStr;

    this.addForm.patchValue({
      pHeadName: parent.headName,
      headLevel: parentLevel + 1,
      headType: parent.headType,
      headCode: newHeadCode
    });
  }

  // ---------------- Submit ----------------
  onSubmit(): void {
    if (this.addForm.invalid) {
      Swal.fire({
        icon: 'warning',
        title: 'Required Fields Missing',
        text: 'Please fill all required fields.',
        confirmButtonColor: '#2199e8'
      });
      return;
    }

    const payload = this.addForm.getRawValue();
    payload.parentHead = payload.parentHead || 0;

    const effectiveId = this.editId ?? this.chartOfAccountId;

    if (this.isEditMode && effectiveId) {
      // Update
      payload.id = effectiveId;
      this.chartOfAccountService
        .updateChartOfAccount(effectiveId, payload)
        .subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Updated Successfully',
              text: 'Chart Of Account has been updated successfully.',
              confirmButtonColor: '#28a745'
            }).then(() => {
              this.toggleModal('app-chartofaccountcreate'); // close sidebar
              this.onDepartmentChange.emit(); // notify parent to reload
            });
          },
          error: err => {
            Swal.fire({
              icon: 'error',
              title: 'Update Failed',
              text: this.errMsg(err),
              confirmButtonColor: '#dc3545'
            });
          }
        });
    } else {
      // Create
      this.chartOfAccountService.createChartOfAccount(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Created Successfully',
            text: 'Chart Of Account has been created successfully.',
            confirmButtonColor: '#28a745'
          }).then(() => {
            this.toggleModal('app-chartofaccountcreate'); // close sidebar
            this.onDepartmentChange.emit(); // notify parent to reload
            this.enterCreateDefaults(); // reset if sidebar stays open
          });
        },
        error: err => {
          Swal.fire({
            icon: 'error',
            title: 'Creation Failed',
            text: this.errMsg(err),
            confirmButtonColor: '#dc3545'
          });
        }
      });
    }
  }

  // ---------------- Utils ----------------
  private alert(
    icon: 'success' | 'error' | 'warning' | 'info' | 'question',
    title: string,
    text?: string
  ) {
    Swal.fire({ icon, title, text: text || undefined });
  }

  private errMsg(err: any): string {
    return (
      err?.error?.message || err?.message || 'An error occurred. Please try again.'
    );
  }
}
