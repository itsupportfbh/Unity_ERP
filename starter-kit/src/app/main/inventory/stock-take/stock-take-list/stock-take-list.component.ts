import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import { DatePipe } from '@angular/common';
import * as feather from 'feather-icons';
import { StockTakeService } from '../stock-take.service'
import { ItemMasterService } from '../../item-master/item-master.service';
import { BinService } from '../../../master/bin/bin.service'
import { StockIssueService } from 'app/main/master/stock-issue/stock-issue.service';

@Component({
  selector: 'app-stock-take-list',
  templateUrl: './stock-take-list.component.html',
  styleUrls: ['./stock-take-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [DatePipe]
})
export class StockTakeListComponent implements OnInit {

  @ViewChild(DatatableComponent) table: DatatableComponent;
  @ViewChild('tableRowDetails') tableRowDetails: any;
  @ViewChild('SweetAlertFadeIn') SweetAlertFadeIn: any;
  colors = ['bg-light-primary', 'bg-light-success', 'bg-light-danger', 'bg-light-warning', 'bg-light-info'];
  rows: any[] = [];
  tempData: any[] = [];
  public searchValue = '';
  public ColumnMode = ColumnMode;
  public selectedOption = 10;
  hover = false;
  passData: any;
  showLinesModal = false;
  modalLines: any[] = [];
  userId: any;
  modalTotal: any;
  itemList: any;
  takeTypes = [
    { id: 1, label: 'Full', },
    { id: 2, label: 'Cycle', }
  ];


  takeTypeMap: Record<number, string> = {};
  binList: any;
  reasonList: any

  constructor(private stockTakeService: StockTakeService, private router: Router,private StockissueService: StockIssueService,
    private datePipe: DatePipe, private itemMasterService: ItemMasterService,private BinService: BinService,
  ) { this.userId = localStorage.getItem('id'); }
  ngOnInit(): void {
    this.loadRequests();
    this.itemMasterService.getAllItemMaster().subscribe((res: any) => {
      this.itemList = res.data;
    })
    this.BinService.getAllBin().subscribe((res: any) => {
      this.binList = res.data;
    })
    this.StockissueService.getAllStockissue().subscribe((res: any) => {
      this.reasonList = res.data;
    })
  }
  filterUpdate(event) {

    const val = event.target.value.toLowerCase();
    const temp = this.tempData.filter((d) => {

      if (d.warehouseName.toLowerCase().indexOf(val) !== -1 || !val) {
        return d.warehouseName.toLowerCase().indexOf(val) !== -1 || !val;
      }
      if (d.locationName.toLowerCase().indexOf(val) !== -1 || !val) {
        return d.locationName.toLowerCase().indexOf(val) !== -1 || !val;
      }
      if (d.takeTypeLabel.toLowerCase().indexOf(val) !== -1 || !val) {
        return d.takeTypeLabel.toLowerCase().indexOf(val) !== -1 || !val;
      }

    });
    this.rows = temp;
    this.table.offset = 0;
  }


  loadRequests() {
    for (const t of this.takeTypes) {
      this.takeTypeMap[t.id] = t.label;
    }
    this.stockTakeService.getStockTake().subscribe({
      next: (res: any) => {
        this.rows = res.data.map((req: any) => {
          return {
            ...req,
            takeTypeLabel: this.takeTypeMap[req.takeTypeId] ?? String(req.takeTypeId)
          };
        });
        this.tempData = this.rows
      },
      error: (err: any) => console.error('Error loading list', err)
    });
  }


  editStockTake(row: any) {
    this.router.navigateByUrl(`/Inventory/edit-stocktake/${row.id}`)
  }

  deleteStockTake(id: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the Stock Take.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.stockTakeService.deleteStockTake(id, this.userId).subscribe({
          next: () => {
            this.loadRequests();
            Swal.fire('Deleted!', 'Stock Take has been deleted.', 'success');
          },
          error: (err) => console.error('Error deleting request', err)
        });
      }
    });
  }

  openCreate() {
    this.passData = {};
    this.router.navigate(['/Inventory/create-stocktake']);

  }
  openLinesModal(row: any) {
    debugger
    // 1) get array safely
    const raw = Array.isArray(row?.lineItems) ? row.lineItems : JSON.parse(row?.lineItems || '[]');

    // 2) normalize to numbers + safe strings
    const N = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;

    const lines = raw.map((l: any) => ({
      barcode: (l?.barcode ?? '-') as string,
      binId: (l?.binId),
      itemId: (l?.itemId),
      itemName: (l?.itemName ?? l?.name ?? '-') as string,
      onHand: N(l?.onHand ?? l?.available),
      countedQty: N(l?.countedQty),
      badCountedQty:N(l?.badCountedQty),
      totalQty: N(l?.countedQty)+N(l?.badCountedQty), 
      variance: (l.countedQty + l.badCountedQty) - N(l.onHand),  
      reasonId: (l?.reasonId ?? '-') as string ,
      remarks: (l?.remarks ?? '-') as string
    }));

    // 3) compute totals
    this.modalTotal = {
      available: lines.reduce((s, x) => s + x.onHand, 0),
      counted: lines.reduce((s, x) => s + x.countedQty, 0),
      variance: lines.reduce((s, x) => s + x.varianceQty, 0)
    };

    this.modalLines = lines;
    this.showLinesModal = true;
  }
  getBinName(id: number | string | null) {
    debugger
    const x = this.binList.find(i => i.id === id);
    return x?.binName ?? String(id ?? '');
  }

  getItemName(id: number | string | null) {
    const x = this.itemList.find(i => i.id === id);
    return x?.name ?? String(id ?? '');
  }

  closeLinesModal() {
    this.showLinesModal = false;
  }

  ngAfterViewChecked(): void {
    feather.replace();  // remove the guard so icons refresh every cycle
  }
  ngAfterViewInit(): void {
    feather.replace();
  }
  private getLinesArray(row: any): any[] {
    if (Array.isArray(row?.lineItems)) return row.lineItems;
    try { return JSON.parse(row?.lineItems || '[]'); } catch { return []; }
  }

  private hasAnySelected(row: any): boolean {
    const lines = this.getLinesArray(row);
    return lines.some(l => !!l.selected);
  }

  post(row: any) {
    debugger
    // Only allow when Approved (2). API also guards this.
    if (row.status !== 2) {
      Swal.fire({ icon: 'info', title: 'Not allowed', text: 'Only Approved stock takes can be posted.' });
      return;
    }
    if (!this.hasAnySelected(row)) {
      Swal.fire({
        icon: 'warning',
        title: 'No lines selected',
        text: 'Select at least one line in the Stock Review before posting.'
      });
      return;
    }

    Swal.fire({
      title: 'Post inventory?',
      text: 'This will create inventory adjustments and set OnHand.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2E5F73',
      confirmButtonText: 'Yes, Post'
    }).then((r) => {
      if (!r.isConfirmed) return;

      row._posting = true;
      this.stockTakeService.postInventory(row.id, {
        reason : row.reason,
        remarks: row.remarks,
        applyToStock: true,
        markPosted: true,
        txnDate: null,
        onlySelected: true,  // post only rows where Selected=1
      }).subscribe({
        next: (res: any) => {
          row._posting = false;
          if (res?.isSuccess) {
            Swal.fire({ icon: 'success', title: 'Posted', text: res.message || 'Inventory posted.' });
            // reflect Posted state
            row.status = 3;
            this.rows = [...this.rows]; // trigger change detection
          } else {
            Swal.fire({ icon: 'error', title: 'Failed', text: res?.message || 'Post failed.' });
          }
        },
        error: (err) => {
          row._posting = false;
          const msg = err?.error?.message || 'Unable to post.';
          Swal.fire({ icon: 'error', title: 'Error', text: msg });
        }
      });
    });
  }
   getReason(id: number | string | null) {
    debugger
    const x = this.reasonList.find(i => i.id === id);
    return x?.stockIssuesNames ?? String(id ?? '');
  }
   
}








