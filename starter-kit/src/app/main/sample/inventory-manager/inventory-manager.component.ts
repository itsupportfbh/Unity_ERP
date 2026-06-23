import { Component, OnInit, AfterViewInit } from '@angular/core';
import feather from 'feather-icons';
import {
  DashboardService,
  InventoryManagerKpi
} from '../dashboard.service';

@Component({
  selector: 'app-inventory-manager',
  templateUrl: './inventory-manager.component.html',
  styleUrls: ['./inventory-manager.component.scss']
})
export class InventoryManagerComponent implements OnInit, AfterViewInit {

  companyId = Number(localStorage.getItem('companyId')) || 0;

  totalSKUs = 0;
  belowMin = 0;
  negativeStock = 0;
  slowMoving = 0;

  totalSkusChange = 0;
  belowMinChange = 0;
  negativeStockChange = 0;
  slowMovingChange = 0;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadInventoryManagerKpi();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  loadInventoryManagerKpi(): void {
    this.dashboardService.getInventoryManagerKpi(this.companyId).subscribe({
      next: (res: InventoryManagerKpi) => {
        this.totalSKUs = res.totalSkus ?? 0;
        this.belowMin = res.belowMin ?? 0;
        this.negativeStock = res.negativeStock ?? 0;
        this.slowMoving = res.slowMoving ?? 0;

        this.totalSkusChange = res.totalSkusChange ?? 0;
        this.belowMinChange = res.belowMinChange ?? 0;
        this.negativeStockChange = res.negativeStockChange ?? 0;
        this.slowMovingChange = res.slowMovingChange ?? 0;

        setTimeout(() => feather.replace(), 0);
      },
      error: (err) => {
        console.error('Inventory Manager KPI error:', err);
      }
    });
  }

  absValue(value: number): number {
    return Math.abs(Number(value || 0));
  }
}