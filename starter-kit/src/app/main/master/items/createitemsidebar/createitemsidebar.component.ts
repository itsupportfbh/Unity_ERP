import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { NgForm } from '@angular/forms';
import Swal from 'sweetalert2';

import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';
import { UomService } from '../../uom/uom.service';
import { ChartofaccountService } from 'app/main/financial/chartofaccount/chartofaccount.service';
import { ItemsService } from '../items.service';
import { CatagoryService } from '../../catagory/catagory.service';
import { numericIndexGetter } from '@swimlane/ngx-datatable';

@Component({
  selector: 'app-createitemsidebar',
  templateUrl: './createitemsidebar.component.html',
  styleUrls: ['./createitemsidebar.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CreateitemsidebarComponent implements OnInit, OnChanges {
  @Input() editId: number | null = null;       // pass id when editing
  @Output() saved = new EventEmitter<void>();  // notify parent after save

  // Form model (bound in your HTML)
  itemId: number | null = null;
  itemCode: string = '';
  itemName: string = '';
  uom: number | null = null;      
  category: number | null = null;      // <-- matches [(ngModel)]="uom"
  budgetLine: number | null = null;   // <-- matches [(ngModel)]="budgetLine"

  // Dropdown data
  uomList: any[] = [];
  parentHeadList: Array<{ value: number; label: string }> = [];

  // UI state
  isEditMode = false;
  saving = false;
  loading = false;
  userId: any;
 CategoryList: any[] = [];
 
  constructor(
    private sidebarSvc: CoreSidebarService,
    private uomService: UomService,
    private coaService: ChartofaccountService,
    private itemsService: ItemsService,
    private CategoryService: CatagoryService
  ) { this.userId = localStorage.getItem('id');}

  // ---------------- lifecycle ----------------
  ngOnInit(): void {
    this.loadUom();
    this.loadAccountHeads();
    this.loadCatagory();
    if (this.editId) this.startEdit(this.editId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('editId' in changes) {
      const id = changes['editId'].currentValue as number | null;
      if (id) this.startEdit(id);
      else this.resetFormModel();
    }
  }

  // ---------------- sidebar ----------------
  toggleSidebar(name: string = 'app-createitemsidebar'): void {
    const reg = this.sidebarSvc.getSidebarRegistry(name);
    reg?.toggleOpen?.();
  }

  // ---------------- dropdowns (simple, as requested) ----------------
  loadUom() {
    // your exact simple pattern
    this.uomService.getAllUom().subscribe((res: any) => {
      this.uomList = (res?.data || []).filter((item: any) => item.isActive === true);
    });
  }

  loadAccountHeads(): void {
    this.coaService.getAllChartOfAccount().subscribe((res: any) => {
      const data = (res?.data || []).filter((x: any) => x.isActive === true);
      this.parentHeadList = data.map((head: any) => ({
        value: Number(head.id),
        label: this.buildFullPath(head, data)
      }));
    });
  }

  /** Build breadcrumb like: Parent >> Child >> This */
  private buildFullPath(item: any, all: any[]): string {
    let path = item.headName;
    let current = all.find((x: any) => x.headCode === item.parentHead);
    while (current) {
      path = `${current.headName} >> ${path}`;
      current = all.find((x: any) => x.headCode === current.parentHead);
    }
    return path;
  }

  // ---------------- edit mode ----------------
  private startEdit(id: number): void {
    this.isEditMode = true;
    this.itemId = id;
    this.fetchItem(id);
  }

  private fetchItem(id: number): void {
    this.loading = true;
    this.itemsService.getByIdItem(id).subscribe({
      next: (res: any) => {
        this.loading = false;
        const d = res?.data ?? res;
        if (!d) return;

        this.itemId = d.id ?? id;
        this.itemCode = d.itemCode ?? '';
        this.itemName = d.itemName ?? '';
        this.category = d.categoryId,
        this.uom = d.uomId ?? null;
        this.budgetLine = d.budgetLineId ?? null;
      },
      error: (err) => {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Failed to load item',
          text: this.errMsg(err),
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  // ---------------- submit (create & update) ----------------
  onSubmit(form: NgForm): void {
    if (!form.valid) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please fill all required fields',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (!this.uom || !this.budgetLine) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please select UOM and Ledger Name',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this.saving = true;
    const now = new Date();

    const base: any = {
      itemCode: (this.itemCode || '').trim(),
      itemName: (this.itemName || '').trim(),
      categoryId: Number(this.category),
      uomId: Number(this.uom),
      budgetLineId: Number(this.budgetLine),
      updatedBy: this.userId,
      updatedDate: now
    };

    if (this.isEditMode && this.itemId) {
      // update
      this.itemsService.updateItem(this.itemId, { id: this.itemId, ...base }).subscribe({
        next: () => {
          this.saving = false;
          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'Item updated successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          }).then(() => {
            this.saved.emit();
            this.toggleSidebar('app-createitemsidebar');
          });
        },
        error: (err) => {
          this.saving = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: this.errMsg(err) || 'Failed to update item',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      // create
      const payload = { ...base, createdBy: this.userId, createdDate: now };
      this.itemsService.createItem(payload).subscribe({
        next: () => {
          this.saving = false;
          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: 'Item created successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          }).then(() => {
            this.saved.emit();
            form.resetForm();
            this.resetFormModel();
            this.toggleSidebar('app-createitemsidebar');
          });
        },
        error: (err) => {
          this.saving = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: this.errMsg(err) || 'Failed to create item',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  // ---------------- utils ----------------
  private resetFormModel(): void {
    this.isEditMode = false;
    this.itemId = null;
    this.itemCode = '';
    this.itemName = '';
    this.uom = null;
    this.category=null;
    this.budgetLine = null;
  }

  private errMsg(err: any): string {
    return err?.error?.message || err?.message || 'Please try again.';
  }
    loadCatagory() {
      this.CategoryService.getAllCatagory().subscribe((res: any) => {
        // Filter only active ones
        this.CategoryList = res.data.filter((item: any) => item.isActive === true);
       
      });
    }
}
