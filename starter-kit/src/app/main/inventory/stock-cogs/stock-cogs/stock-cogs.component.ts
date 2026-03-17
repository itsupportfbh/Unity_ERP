import { Component, OnInit } from '@angular/core';
import { CogsItemRow, CogsReport } from './cogs-report.model';
import { CogsReportService } from '../stock-cogs-service';
import { WarehouseService } from 'app/main/master/warehouse/warehouse.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type TabKey = 'table' | 'chart' | 'formula';
type WarehouseDto = {
  id: number;
  name: string;
};

@Component({
  selector: 'app-stock-cogs',
  templateUrl: './stock-cogs.component.html',
  styleUrls: ['./stock-cogs.component.scss']
})
export class StockCogsComponent implements OnInit {

  loading = false;

  // UI state
  activeTab: TabKey = 'table';
  search = '';

  // Inputs
  fromDate = this.toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  toDate = this.toISODate(new Date());
  warehouseList: WarehouseDto[] = [];
  warehouseId: number | null = null;
  binId?: number;

  // Data
  report?: CogsReport;

  constructor(private api: CogsReportService, private whApi: WarehouseService) {}

  ngOnInit(): void {
    this.loadWarehouses(() => {
    this.load();
  });
  }

  load(): void {
    this.loading = true;

    this.api.getCogs(this.fromDate, this.toDate, this.warehouseId, this.binId).subscribe({
      next: (res: any) => {
        this.report = res?.data;

        // optional: remove dummy row
        if (this.report?.items?.length) {
          this.report.items = this.report.items.filter(x => (x?.itemId ?? 0) > 0);
        }

        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }
  private loadWarehouses(done?: () => void): void {
  this.whApi.getWarehouse().subscribe({
    next: (res: any) => {
      this.warehouseList = (res?.data || res || [])
        .map((x: any) => ({
          id: Number(x.id ?? x.Id ?? 0),
          name: String(x.name ?? x.Name ?? '')
        }))
        .filter((x: WarehouseDto) => x.id > 0);

      this.setDefaultWarehouseIfNeeded();
      done?.();
    },
    error: () => {
      this.warehouseList = [];
      this.warehouseId = null;
      done?.();
    }
  });
}

private setDefaultWarehouseIfNeeded(): void {
  if (this.warehouseId && this.warehouseId > 0) return;

  const userWh = Number(localStorage.getItem('defaultWarehouseId') || 0);
  if (userWh > 0) {
    this.warehouseId = userWh;
    return;
  }

  if (this.warehouseList.length > 0) {
    this.warehouseId = this.warehouseList[0].id;
  } else {
    this.warehouseId = null;
  }
}

  setTab(t: TabKey) {
    this.activeTab = t;
  }

  get rows(): CogsItemRow[] {
    const items = this.report?.items ?? [];
    const q = (this.search || '').trim().toLowerCase();
    if (!q) return items;

    return items.filter(x =>
      (x.itemName || '').toLowerCase().includes(q) ||
      String(x.itemId).includes(q)
    );
  }
  get selectedWarehouseName(): string {
  if (this.warehouseId == null) return 'All Warehouses';
  const wh = this.warehouseList.find(x => x.id === this.warehouseId);
  return wh?.name || `Warehouse ${this.warehouseId}`;
}

  money(n?: number) {
  const v = Number(n ?? 0);
  return `$${v.toLocaleString('en-SG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
  private toISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  unitPrice(value: number, qty: number): number {
  const q = Number(qty || 0);
  const v = Number(value || 0);
  if (!q) return 0;
  return v / q;
}
private buildCogsExportRows(): any[] {
  const data = this.rows || [];

  return data.map((r: any, idx: number) => ({
    'Sl. No': idx + 1,
    'Item Code': r.itemCode || '',
    'Item Name': r.itemName || r.itemText || '',
    'Opening Qty': Number(r.openingQty || 0),
    'Opening Price': Number(this.unitPrice(r.openingValue, r.openingQty) || 0),
    'Opening Value': Number(r.openingValue || 0),
    'Purchase Qty': Number(r.purchaseQty || 0),
    'Purchase Price': Number(this.unitPrice(r.purchaseValue, r.purchaseQty) || 0),
    'Purchase Value': Number(r.purchaseValue || 0),
    'Closing Qty': Number(r.closingQty || 0),
    'Closing Price': Number(this.unitPrice(r.closingValue, r.closingQty) || 0),
    'Closing Value': Number(r.closingValue || 0),
    'COGS': Number(r.cogsValue || 0)
  }));
}

exportToExcel(): void {
  const data = this.buildCogsExportRows();
  if (!data.length) return;

  const from = this.fromDate || 'all';
  const to = this.toDate || 'all';
  const whName = this.selectedWarehouseName;
  const safeWhName = whName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');

  const summary = [
    {
      'From Date': from,
      'To Date': to,
      'Warehouse': whName,
      'Opening Stock': Number(this.report?.summary?.openingStock || 0),
      'Purchases': Number(this.report?.summary?.purchases || 0),
      'Closing Stock': Number(this.report?.summary?.closingStock || 0),
      'COGS': Number(this.report?.summary?.cogs || 0)
    }
  ];

  const wb: XLSX.WorkBook = XLSX.utils.book_new();

  // Summary sheet
  const wsSummary: XLSX.WorkSheet = XLSX.utils.json_to_sheet(summary);

  // column widths
  wsSummary['!cols'] = [
    { wch: 14 }, // From Date
    { wch: 14 }, // To Date
    { wch: 24 }, // Warehouse
    { wch: 16 }, // Opening Stock
    { wch: 16 }, // Purchases
    { wch: 16 }, // Closing Stock
    { wch: 14 }  // COGS
  ];

  // Apply currency format to summary amount columns
  ['D2', 'E2', 'F2', 'G2'].forEach(cellRef => {
    if (wsSummary[cellRef]) {
      wsSummary[cellRef].t = 'n';
      wsSummary[cellRef].z = '$#,##0.00';
    }
  });

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Detail sheet
  const wsDetail: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

  // column widths
  wsDetail['!cols'] = [
    { wch: 8 },   // Sl. No
    { wch: 14 },  // Item Code
    { wch: 28 },  // Item Name
    { wch: 12 },  // Opening Qty
    { wch: 14 },  // Opening Price
    { wch: 14 },  // Opening Value
    { wch: 12 },  // Purchase Qty
    { wch: 14 },  // Purchase Price
    { wch: 14 },  // Purchase Value
    { wch: 12 },  // Closing Qty
    { wch: 14 },  // Closing Price
    { wch: 14 },  // Closing Value
    { wch: 12 }   // COGS
  ];

  // Money columns in detail sheet:
  // E = Opening Price
  // F = Opening Value
  // H = Purchase Price
  // I = Purchase Value
  // K = Closing Price
  // L = Closing Value
  // M = COGS
  for (let row = 2; row <= data.length + 1; row++) {
    ['E', 'F', 'H', 'I', 'K', 'L', 'M'].forEach(col => {
      const cellRef = `${col}${row}`;
      if (wsDetail[cellRef]) {
        wsDetail[cellRef].t = 'n';
        wsDetail[cellRef].z = '$#,##0.00';
      }
    });
  }

  XLSX.utils.book_append_sheet(wb, wsDetail, 'COGS Details');

  const fileName = `COGS-${from}-to-${to}-${safeWhName}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

exportToPdf(): void {
  const data = this.buildCogsExportRows();
  if (!data.length) return;

  const doc = new jsPDF('l', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const from = this.fromDate || 'All';
  const to = this.toDate || 'All';
 const wh = this.selectedWarehouseName;

  const title = `COGS Report (${from} to ${to})`;

  doc.setFontSize(12);
  doc.text(title, pageWidth / 2, 30, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Warehouse: ${wh}`, 40, 50);

  doc.text(
    `Opening Stock: ${this.money(this.report?.summary?.openingStock || 0)}`,
    40,
    70
  );
  doc.text(
    `Purchases: ${this.money(this.report?.summary?.purchases || 0)}`,
    220,
    70
  );
  doc.text(
    `Closing Stock: ${this.money(this.report?.summary?.closingStock || 0)}`,
    380,
    70
  );
  doc.text(
    `COGS: ${this.money(this.report?.summary?.cogs || 0)}`,
    570,
    70
  );

  const head = [[
    'Sl. No',
    'Item Code',
    'Item Name',
    'Opening Qty',
    'Opening Price',
    'Opening',
    'Purchase Qty',
    'Purchase Price',
    'Purchases',
    'Closing Qty',
    'Closing Price',
    'Closing',
    'COGS'
  ]];

 const body = data.map(r => [
  String(r['Sl. No'] ?? ''),
  String(r['Item Code'] ?? ''),
  String(r['Item Name'] ?? ''),
  Number(r['Opening Qty'] || 0).toFixed(2),
  this.money(r['Opening Price'] || 0),
  this.money(r['Opening Value'] || 0),
  Number(r['Purchase Qty'] || 0).toFixed(2),
  this.money(r['Purchase Price'] || 0),
  this.money(r['Purchase Value'] || 0),
  Number(r['Closing Qty'] || 0).toFixed(2),
  this.money(r['Closing Price'] || 0),
  this.money(r['Closing Value'] || 0),
  this.money(r['COGS'] || 0)
]);

  autoTable(doc, {
    head,
    body,
    startY: 85,
    margin: { left: 20, right: 20 },
    styles: {
      fontSize: 8,
      valign: 'middle',
      halign: 'right'
    },
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'left' },
      2: { halign: 'left' }
    },
    headStyles: {
      halign: 'left'
    }
  });

  const fileName = `COGS-${from}-to-${to}-WH-${wh}.pdf`;
  doc.save(fileName);
}
}