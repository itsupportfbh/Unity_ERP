import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { CoreCommonModule } from '@core/common.module';
import { ContentHeaderModule } from 'app/layout/components/content-header/content-header.module';
import { SampleComponent } from './sample.component'; 
import { HomeComponent } from './home.component';
import { SalesExecutiveComponent } from './sales-executive/sales-executive.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { SalesTrendComponent } from './sales-trend/sales-trend.component';
import { SalesOverviewComponent } from './sales-overview/sales-overview.component';
import { OpenSalesOrderComponent } from './open-sales-order/open-sales-order.component';
import { SalesManagerDashboardComponent } from './sales-maneger-dashboard/sales-maneger-dashboard.component';
import { ARAgingComponent } from './ar-aging/ar-aging.component';
import { StoreInchargeComponent } from './store-incharge/store-incharge.component';
import { TopStockItemsComponent } from './top-stock-items/top-stock-items.component';
import { WarehousSummaryComponent } from './warehous-summary/warehous-summary.component';
import { ProcurementManagerComponent } from './procurement-manager/procurement-manager.component';
import { PurchaseFlowComponent } from './purchase-flow/purchase-flow.component';
import { ApAgingComponent } from './ap-aging/ap-aging.component';
import { OpenPurchaseOrdersComponent } from './open-purchase-orders/open-purchase-orders.component';
import { ProcurementExecutiveComponent } from './procurement-executive/procurement-executive.component';
import { MyPurchaseRequestsComponent } from './my-purchase-requests/my-purchase-requests.component';
import { MyPipelineComponent } from './my-pipeline/my-pipeline.component';
import { FinanceExecutiveComponent } from './finance-executive/finance-executive.component';
import { FinanceArAgingComponent } from './finance-ar-aging/finance-ar-aging.component';
import { FinanceManagerDashboardComponent } from './finance-manager-dashboard/finance-manager-dashboard.component';
import { ArApHealthComponent } from './ar-ap-health/ar-ap-health.component';
import { ARAPAgingComponent } from './ar-ap-aging/ar-ap-aging.component';
import { AllFinanceExceptionsComponent } from './all-finance-exceptions/all-finance-exceptions.component';
import { InventoryExecutionComponent } from './inventory-execution/inventory-execution.component';
import { StockMovementsTodayComponent } from './stock-movements-today/stock-movements-today.component';
import { QuickStatsComponent } from './quick-stats/quick-stats.component';
import { InventoryManagerComponent } from './inventory-manager/inventory-manager.component';
import { InventoryByCategoryComponent } from './inventory-by-category/inventory-by-category.component';
import { StockAlertsComponent } from './stock-alerts/stock-alerts.component';
import { RecipeProductionComponent } from './recipe-production/recipe-production.component';
import { PlanningOrdersComponent } from './planning-orders/planning-orders.component';
import { SystemAdminComponent } from './system-admin/system-admin.component';
import { ModuleHealthComponent } from './module-health/module-health.component';
import { AdminARAPHealthComponent } from './admin-ar-ap-health/admin-ar-ap-health.component';
import { SystemWideExceptionsComponent } from './system-wide-exceptions/system-wide-exceptions.component';
import { ProductionManagerComponent } from './production-manager/production-manager.component';
import { ProductionOutputComponent } from './production-output/production-output.component';
import { TopRecipesComponent } from './top-recipes/top-recipes.component';
import { ProductionOrdersComponent } from './production-orders/production-orders.component';
import { FinanceAPAgingComponent } from './finance-ap-aging/finance-ap-aging.component';


const routes = [
  {
    path: 'sample',
    component: SampleComponent,
    data: { animation: 'sample' }
  },
  {
    path: 'home',
    component: HomeComponent,
    data: { animation: 'home' }
  }
];

@NgModule({
  declarations: [
    SampleComponent,
    HomeComponent,
    SalesExecutiveComponent,
    SalesTrendComponent,
    SalesOverviewComponent,
    OpenSalesOrderComponent,
    SalesManagerDashboardComponent,
    ARAgingComponent,
    StoreInchargeComponent,
    TopStockItemsComponent,
    WarehousSummaryComponent,
    ProcurementManagerComponent,
    PurchaseFlowComponent,
    ApAgingComponent,
    OpenPurchaseOrdersComponent,
    ProcurementExecutiveComponent,
    MyPurchaseRequestsComponent,
    MyPipelineComponent,
    FinanceExecutiveComponent,
    FinanceArAgingComponent,
    FinanceManagerDashboardComponent,
    ArApHealthComponent,
    ARAPAgingComponent,
    AllFinanceExceptionsComponent,
    InventoryExecutionComponent,
    StockMovementsTodayComponent,
    QuickStatsComponent,
    InventoryManagerComponent,
    InventoryByCategoryComponent,
    StockAlertsComponent,
    RecipeProductionComponent,
    PlanningOrdersComponent,
    SystemAdminComponent,
    ModuleHealthComponent,
    AdminARAPHealthComponent,
    SystemWideExceptionsComponent,
    ProductionManagerComponent,
    ProductionOutputComponent,
    TopRecipesComponent,
    ProductionOrdersComponent,
     HomeComponent,
  FinanceAPAgingComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ContentHeaderModule,
    TranslateModule,
    CoreCommonModule,
    FormsModule,
    NgSelectModule,
    NgApexchartsModule
  ],
  exports: [
    SalesOverviewComponent
  ]
})
export class SampleModule {}