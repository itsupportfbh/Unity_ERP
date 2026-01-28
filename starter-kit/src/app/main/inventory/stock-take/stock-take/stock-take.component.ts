import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { StockTakeService } from '../stock-take.service';
import { forkJoin } from 'rxjs';
import { WarehouseService } from 'app/main/master/warehouse/warehouse.service';
import { StrategyService } from 'app/main/master/strategies/strategy.service';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { ItemMasterService } from '../../item-master/item-master.service';
import { BinService } from '../../../master/bin/bin.service'
import { StockIssueService } from 'app/main/master/stock-issue/stock-issue.service';
import { SupplierService } from 'app/main/businessPartners/supplier/supplier.service';

interface SelectOpt { id: number | string; name?: string; label?: string; value?: string; }

interface StockTakeLine {
  id: number;
  itemId: number | string | null;
  WarehouseTypeId:number
  supplierId : number
  itemName: string | null;
  binId: number
  binName:any
  onHand: number | null;
  badOnHand?: number | null;  
  countedQty: number | null;
  badCountedQty: number | null;
  barcode?: string | null;
  reasonId: number | string | null;
  remarks?: string | null;
  _error?: string | null; // UI-only
  selected: any
  status:any
  supplierName?: string | null;
}

@Component({
  selector: 'app-stock-take',
  templateUrl: './stock-take.component.html',
  styleUrls: ['./stock-take.component.scss']
})
export class StockTakeComponent implements OnInit {

  warehouseTypes: any
  LocationTypes: any
  takeTypes = [
    { id: 1, label: 'Full', },
    { id: 2, label: 'Cycle', }
  ];
  strategies: any
  warehouseTypeId: any
  supplierId: number = 0;  // default ALL
  takeTypeId: any;  
  strategyId: number = 0;  // default ALL
  freeze: boolean = false;
  status: any

  lines: StockTakeLine[] = [];



  @ViewChild('reviewTpl', { static: true }) reviewTpl!: any;
  @ViewChild('chkSelectAllRef') chkSelectAllRef!: ElementRef<HTMLInputElement>;
  private reviewRef?: NgbModalRef;

  strategyCheck: boolean = false;
  stockTakeId: any = 0;
  itemList: any;
  reasonList: any
  supplierList: any
  showStockReview = false;
  selectAllReview = false;

  reviewRows: Array<StockTakeLine & {
    selected?: boolean;
  }> = [];


  constructor(private router: Router, private modal: NgbModal, private stockTakeService: StockTakeService,
    private warehouseService: WarehouseService, private BinService: BinService,
    private strategyService: StrategyService, private itemMasterService: ItemMasterService,
    private route: ActivatedRoute, private StockissueService: StockIssueService,
    private supplierService : SupplierService,private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    debugger
    forkJoin({
      warehouse: this.warehouseService.getWarehouse(),
      bin: this.BinService.getAllBin(),
      strategy: this.strategyService.getStrategy(),
      item: this.itemMasterService.getAllItemMaster(),
      reason: this.StockissueService.getAllStockissue(),
      supplier:  this.supplierService.GetAllSupplier(),
    }).subscribe((results: any) => {
      this.warehouseTypes = results.warehouse.data;
      this.LocationTypes = results.bin.data;
      const st = results.strategy.data ?? [];
      this.strategies = [{ id: 0, strategyName: 'ALL' }, ...st];
      this.itemList = results.item.data;
      this.reasonList = results.reason.data;
      const sup = results.supplier.data ?? [];
      this.supplierList = [{ id: 0, name: 'ALL' }, ...sup];

      if (this.supplierId == null) this.supplierId = 0;
      if (this.strategyId == null) this.strategyId = 0;
    });
    this.route.paramMap.subscribe((params: any) => {
      const idStr = params.get('id');
      this.stockTakeId = idStr ? Number(idStr) : 0;
      if (this.stockTakeId) {
        this.stockTakeService.getStockTakeById(this.stockTakeId).subscribe((res: any) => {
          console.log(res)
          this.warehouseTypeId = res.data.warehouseTypeId,
          this.supplierId = res.data.supplierId,
          this.takeTypeId = res.data.takeTypeId,
          this.strategyId = res.data.strategyId,
          this.freeze = res.data.freeze
          this.status = res.data.status
          this.lines = res.data.lineItems
           this.reviewRows = (this.lines || []).map(l => ({
        ...l,
        selected: l.selected ?? false,   // ← default unchecked rows to false
      }));
      this.getSuppliersByWarehouse(this.warehouseTypeId)
       this.supplierId = res.data.supplierId
          if (this.takeTypeId == 1) {
            this.strategyCheck = true;
          } else {
            this.strategyCheck = false
          }
          // this.toggleStockReview()
        })
      }

    })
  }
  ngAfterViewInit(): void {
    feather.replace();
  }

  ngAfterViewChecked(): void {
    feather.replace();
  }

  // onTypeChanged(id: number) {
  //   this.strategyId = null
  //   this.takeTypeId = id;
  //   if (this.takeTypeId == 1) {
  //     this.strategyCheck = true;
  //   } else {
  //     this.strategyCheck = false;
  //   }

  // }


  onExportMobileTasks(): void {
    if (!this.lines.length) { alert('Plan lines first.'); return; }
    console.log('Exporting mobile tasks for', this.lines.length, 'lines');
  }

  onCountChange(r: StockTakeLine): void {
    this.showStockReview = false
    const n = Math.floor(Number(r.countedQty));
    if (!Number.isFinite(n) || n < 0) {
      r.countedQty = null;
      r._error = 'Enter a valid number (≥ 0)';
    } else {
      r.countedQty = n;
      r._error = null;
    }
  }
  onUnCountChange(r: StockTakeLine): void {
     this.showStockReview = false
    const n = Math.floor(Number(r.badCountedQty));
    if (!Number.isFinite(n) || n < 0) {
      r.badCountedQty = null;
      r._error = 'Enter a valid number (≥ 0)';
    } else {
      r.badCountedQty = n;
      r._error = null;
    }
  }

  removeLine(i: number): void { this.lines.splice(i, 1); }

  // ===== Helpers for modal/table =====
  toNum(v: any): number { return Number(v) || 0; }
  getVariance(r: StockTakeLine): number {
    const good = this.toNum(r.countedQty);
    const bad = this.toNum((r as any).badCountedQty); // or r.badQty if that's your name
    return (good + bad) - this.toNum(r.onHand);
  }
  signed(n: number): string { return (n >= 0 ? '+' : '') + n; }

  getItemName(id: number | string | null) {
    const x = this.itemList?.find(i => i.id === id);
    return x?.itemName ?? String(id ?? '');
  }
   getBinName(id: number | string | null) {
    const x = this.LocationTypes?.find(i => i.id === id);
    return x?.binName ?? String(id ?? '');
  }
  getReason(id: number | string | null) {
    const x = this.reasonList.find(i => i.id === id);
    return x?.stockIssuesNames ?? String(id ?? '');
  }
  onSupplierChanged(v: number | null): void {
  this.supplierId = Number(v ?? 0); // null => ALL
  this.resetLines();
  }
  onTypeChanged(v: number | null): void {
  this.strategyId = Number(v ?? 0); // null => ALL
  this.resetLines();
}
   private resetLines(): void {
    this.lines = [];                  // new reference
    this.reviewRows = [];             // new reference
    this.selectAllReview = false;
    this.cd.detectChanges();          // force view to notice
  }

  onSubmit(): void {
    this.showStockReview = false
    this.resetLines();
    debugger
    // if (!this.warehouseTypeId ||!this.supplierId  || !this.takeTypeId || (Number(this.takeTypeId) === 2 && (!this.strategyId || this.strategyId === 0))) {
    if (!this.warehouseTypeId ) {
      Swal.fire({
        title: "Failed",
        text: "Please Fill Mandatory Fields",
        icon: "error",
        allowOutsideClick: false,
      });

      return;
    }

    const req = this.buildPlanReq();

    this.stockTakeService.getWarehouseItems(req).subscribe({
      next: (res: any) => {
        debugger
        const raw = res?.data || [];
        this.lines = raw.map(l => this.mapLine(l));

        if (this.freeze) {
          console.log('Freeze flag was sent; backend should have frozen scope.');
        }

        if(this.lines.length == 0){
          { Swal.fire({ icon: 'warning', title: 'No Items in Stocktake list.' }); return; }
        }
      },
      error: (err) => {
        debugger
        this.lines = [];
        const msg =
                err?.error?.message ||
                err?.message 
              Swal.fire({
                icon: 'warning',
                title: 'warning',
                text: msg,
                confirmButtonText: 'OK',
                confirmButtonColor: '#2E5F73'
              });
      }
    });
  }
  private buildPlanReq() {
    return {
      warehouseTypeId: this.warehouseTypeId ?? null,
      supplierId: Number(this.supplierId ?? 0),
      //takeTypeId: this.takeTypeId ?? null,
      strategyId: Number(this.strategyId ?? 0),
      freeze: !!this.freeze,
    };
  }

  // Map API line -> UI line
  private mapLine(dto) {
    return {
      id: dto.id,
      itemId: dto.itemId,
      itemName: dto.itemName ?? null,
      binId: dto.binId,
      supplierId: dto.supplierId,
       supplierName: dto.supplierName ?? '', 
      onHand: Number(dto.onHand) || 0,
      badOnHand: Number(dto.badOnHand) || 0,
      countedQty: 0,
      badCountedQty: 0,
      // barcode: dto.barcode ?? '',
      reasonId: dto.reasonId ?? 0,
      remarks: dto.remarks ?? '',
    };
  }

  // ===== Review modal =====
  openReview(): void {
    if (!this.lines.length) {
      Swal.fire({
        title: "Failed",
        text: "Please Fill Line Items",
        icon: "error",
        allowOutsideClick: false,
      });
      return;
    }
    this.reviewRef = this.modal.open(this.reviewTpl, { size: 'lg', centered: true, backdrop: 'static' });
  }

  onSave(status): void {
    this.status = status
    debugger
    const errs: string[] = [];

    if (!this.lines.length) errs.push('No lines to post.');
    this.lines.forEach((L, i) => {
      if (!L.itemId) errs.push(`Line ${i + 1}: Item is required.`);
      if (L.countedQty == null || !Number.isFinite(Number(L.countedQty)) || Number(L.countedQty) < 0)
        errs.push(`Line ${i + 1}: countedQty must be ≥ 0.`);
      if (L.onHand == null || !Number.isFinite(Number(L.onHand)) || Number(L.onHand) < 0)
        errs.push(`Line ${i + 1}: Book qty missing (plan again or set).`);
    });

    if (errs.length) {
      // Optional: escape HTML to be safe
      const esc = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      Swal.fire({
        title: 'Fix these issues',
        icon: 'error',
        html:
          `<div style="text-align:left"><ul>` +
          errs.map(e => `<li>${esc(e)}</li>`).join('') +
          `</ul></div>`,
        confirmButtonText: 'OK',
        allowOutsideClick: false,
        confirmButtonColor: '#2E5F73'
      });
      return;
    }

    const payload = {
      id: this.stockTakeId ?? 0,
      warehouseTypeId: this.warehouseTypeId,
      supplierId: this.supplierId,
      //takeTypeId: this.takeTypeId,
      strategyId: this.strategyId,
      freeze: this.freeze,
      status: this.status,
      lineItems: this.lines.map(L => {
        const good = this.toNum(L.countedQty);       // usable
        const bad = this.toNum(L.badCountedQty);    // unusable
        const total = good + bad;

        return {
          id: L.id,
          itemId: L.itemId,
          binId:L.binId,
          WarehouseTypeId: this.warehouseTypeId,
          supplierId: Number((L as any).supplierId ?? this.supplierId ?? 0),
          status: this.status,
          onHand: this.toNum(L.onHand),

          // send TOTAL counted; keep the split too (if your API accepts it)
          countedQty: good,

          badCountedQty: bad,

          VarianceQty: total - this.toNum(L.onHand),

          // If you require a reason only when there’s bad qty:
          reasonId: bad > 0 ? L.reasonId : 0,

          barcode: (L.barcode ?? '').trim() || null,
          remarks: (L.remarks ?? '').trim() || null,
          selected: false
        };
      })

    };

    if (this.stockTakeId) {
      this.stockTakeService.updateStockTake(payload).subscribe((res) => {
        if (res.isSuccess) {
          Swal.fire({
            title: "Hi",
            text: res.message,
            icon: "success",
            allowOutsideClick: false,
          });
          this.router.navigateByUrl('/Inventory/list-stocktake')
        }
      });
    }
    else {


      this.stockTakeService.insertStockTake(payload).subscribe((res) => {
        if (res.isSuccess) {
          Swal.fire({
            title: "Hi",
            text: res.message,
            icon: "success",
            allowOutsideClick: false,
          });
          this.router.navigateByUrl('/Inventory/list-stocktake')
        }
      });
    }
  }

  // ===== Nav =====
  goToStockTakeList(): void {
    this.router.navigate(['/Inventory/list-stocktake']); // adjust route
  }


  toggleStockReview(): void {
    this.showStockReview = !this.showStockReview;
    if (this.showStockReview) {
      this.reviewRows = (this.lines || []).map(l => ({
        ...l,
        selected: l.selected ?? false,   // ← default unchecked rows to false
      }));
      this.updateSelectAllFromRows();
    }
  }

  /** Called when header checkbox changes */
  toggleSelectAllReview(): void {
    (this.reviewRows || []).forEach(r => (r.selected = this.selectAllReview));
    // no indeterminate when user explicitly toggles header
    if (this.chkSelectAllRef) this.chkSelectAllRef.nativeElement.indeterminate = false;
  }

  /** Call this after any row checkbox change to sync header state */
  onRowSelectedChanged(): void {
    this.updateSelectAllFromRows();
  }

  /** Keeps header checkbox checked/indeterminate in sync with row selection */
  private updateSelectAllFromRows(): void {
    const total = this.reviewRows?.length || 0;
    const selectedCount = (this.reviewRows || []).filter(r => !!r.selected).length;

    this.selectAllReview = total > 0 && selectedCount === total;

    // Set indeterminate when some but not all are selected
    const indeterminate = selectedCount > 0 && selectedCount < total;
    if (this.chkSelectAllRef) this.chkSelectAllRef.nativeElement.indeterminate = indeterminate;
  }
  onSaveStockReview(status: number): void {
    debugger
    this.status = status;

    // Send all rows, not just selected
    const rows = this.reviewRows || [];

    if (!rows.length) {
      Swal.fire({
        icon: 'info',
        title: 'No lines',
        text: 'There are no lines to send.',
        confirmButtonColor: '#2E5F73'
      });
      return;
    }

       if (!this.hasAnySelected(this.reviewRows)) {
          Swal.fire({
            icon: 'warning',
            title: 'No lines selected',
            text: 'Select at least one line in the Stock Review before Approved.'
          });
          return;
        }

    const payload = {
      id: this.stockTakeId ?? 0,
      warehouseTypeId: this.warehouseTypeId,
      supplierId: this.supplierId,
      //takeTypeId: this.takeTypeId,
      strategyId: this.strategyId,
      freeze: this.freeze,
      status: this.status,
      lineItems: this.reviewRows.map(r => ({
        id: r.id,
        itemId: r.itemId,
        binId : r.binId,
        WarehouseTypeId: this.warehouseTypeId,
        supplierId: Number((r as any).supplierId ?? this.supplierId ?? 0),
        status: this.status,
        onHand: this.toNum(r.onHand),
        countedQty: this.toNum(r.countedQty),
        badCountedQty: this.toNum(r.badCountedQty),
        varianceQty: (this.toNum(r.countedQty) + this.toNum(r.badCountedQty)) - this.toNum(r.onHand),
        reasonId: r.reasonId ?? 0,
        remarks: r.remarks ?? null,
        barcode: r.barcode ?? null,
        selected: !!r.selected,   // ← keep the flag so backend knows which were approved
      })),
    };

     if (this.stockTakeId) {
            this.stockTakeService.updateStockTake(payload).subscribe({
      next: (res: any) => {
        if (res?.isSuccess) {
          Swal.fire({
            icon: 'success',
            title: 'Review updated',
            text: res.message || 'Lines saved.',
            confirmButtonColor: '#2E5F73'
          });
          this.showStockReview = false;
          this.router.navigateByUrl('/Inventory/list-stocktake');
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Failed',
            text: res?.message || 'Unable to save review.',
            confirmButtonColor: '#2E5F73'
          });
        }
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Something went wrong while saving review.',
          confirmButtonColor: '#2E5F73'
        });
      }
    });
     }else{
         this.stockTakeService.insertStockTake(payload).subscribe((res) => {
        if (res.isSuccess) {
          Swal.fire({
            title: "Hi",
            text: res.message,
            icon: "success",
            allowOutsideClick: false,
          });
          this.router.navigateByUrl('/Inventory/list-stocktake')
        }
      });
     }

   
  }



  private hasAnySelected(row: any): boolean {
    debugger
    const lines = row
    return lines.some(l => !!l.selected);
  }

  onCheckReview(){
    this.showStockReview = false
  }
  getSuppliersByWarehouse(event){
    debugger
    this.supplierId = null
    // this.stockTakeService.GetSupplierByWarehouseId(event).subscribe((res:any)=>{
    //   this.supplierList = res.data
    // })
  }
}



