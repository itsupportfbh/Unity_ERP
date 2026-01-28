


  
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { ApprovalLevelComponent } from './approval-level/approval-level.component';
import { CitiesComponent } from './cities/cities.component';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CountriesComponent } from './countries/countries.component';
import { UomComponent } from './uom/uom.component';
import { IncotermsComponent } from './incoterms/incoterms.component';
import { FlagissueComponent } from './flagissue/flagissue.component';
import { PaymentTermsComponent } from './payment-terms/payment-terms.component';
import { CurrencyComponent } from './currency/currency.component';
import { StatesComponent } from './states/states.component';
import { ServiceComponent } from './service/service.component';
import { CustomerGroupsComponent } from './customer-groups/customer-groups.component';
import { SupplierGroupsComponent } from './supplier-groups/supplier-groups.component';
import { LocationComponent } from './location/location.component';
import { CreateLocationComponent } from './location/create-location/create-location.component';
import { RegionsComponent } from './regions/regions/regions.component';
import { DeductionsComponent } from './deductions/deductions/deductions.component';
import { IncomeComponent } from './income/income/income.component';
import { DepartmentComponent } from './department/department/department.component';
import { ItemsComponent } from './items/item-list/items.component';
import { CreateitemsidebarComponent } from './items/createitemsidebar/createitemsidebar.component';
import { CoreSidebarModule } from '@core/components/core-sidebar/core-sidebar.module';
import { WarehouseListComponent } from './warehouse/warehouse-list/warehouse-list.component';
import { WarehouseCreateComponent } from './warehouse/warehouse-create/warehouse-create.component';
import { RecurringComponent } from './recurring/recurring.component';
import { TaxcodeComponent } from './taxcode/taxcode.component';
import { CatagoryComponent } from './catagory/catagory.component';
import { CoastingMethodComponent } from './coasting-method/coasting-method.component';
import { StrategyComponent } from './strategies/strategy/strategy.component';
import { StockIssueComponent } from './stock-issue/stock-issue.component';
import { BinComponent } from './bin/bin.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { DriverComponent } from './driver/driver.component';
import { VehicleComponent } from './vehicle/vehicle.component';
import { BankComponent } from './bank/create-bank/bank.component';
import { ListBankComponent } from './bank/list-bank/list-bank.component';
import { ItemsetComponent } from './itemset/itemset.component';
import { ItemTypeComponent } from './item-type/item-type.component';

const routes: Routes = [
  { path: 'approval-level', component: ApprovalLevelComponent },
  { path: 'cities', component: CitiesComponent },
  { path: 'uom', component: UomComponent },
  { path: 'incoterms', component: IncotermsComponent },
  { path: 'flagIssue', component: FlagissueComponent },
  { path: 'countries', component: CountriesComponent },
  { path: 'paymentTerms', component: PaymentTermsComponent },
  { path: 'currency', component: CurrencyComponent },
  { path: 'states', component: StatesComponent },
  { path: 'service', component: ServiceComponent },
  { path: 'customergroups', component: CustomerGroupsComponent },
  { path: 'suppliergroups', component: SupplierGroupsComponent },
  { path: 'location', component: LocationComponent },
  { path: 'regions', component: RegionsComponent },
  { path: 'deductions', component: DeductionsComponent },
  { path: 'income', component: IncomeComponent },
  { path: 'department', component: DepartmentComponent },
  { path: 'items', component: ItemsComponent },
  { path: 'warehouse', component: WarehouseListComponent },
  { path: 'warehouse-create', component: WarehouseCreateComponent },
  { path: 'recurring', component: RecurringComponent },
  { path: 'taxcode', component: TaxcodeComponent },
  { path: 'catagory', component: CatagoryComponent },
  { path: 'coastingmethod', component: CoastingMethodComponent },
  { path: 'strategy', component: StrategyComponent },
  { path: 'stockIssue', component: StockIssueComponent },
  { path: 'bin', component: BinComponent },
  { path: 'itemSet', component: ItemsetComponent },
   { path: 'itemType', component: ItemTypeComponent },
    { path: 'driver', component: DriverComponent },
    { path: 'vehicle', component: VehicleComponent },
    { path: 'bank', component: BankComponent },
     { path: 'bank-list', component: ListBankComponent },
      { path: 'bank/edit/:id', component: BankComponent },

];

@NgModule({
  declarations: [ApprovalLevelComponent, CountriesComponent, CitiesComponent, UomComponent, IncotermsComponent, FlagissueComponent, PaymentTermsComponent, CurrencyComponent,
    StatesComponent, ServiceComponent, CustomerGroupsComponent, SupplierGroupsComponent, LocationComponent, CreateLocationComponent,
    RegionsComponent, DeductionsComponent, IncomeComponent, DepartmentComponent, ItemsComponent, CreateitemsidebarComponent, WarehouseListComponent, WarehouseCreateComponent, RecurringComponent, TaxcodeComponent, CatagoryComponent, CoastingMethodComponent, StrategyComponent,
    StockIssueComponent, BinComponent, DriverComponent,VehicleComponent, BankComponent, ListBankComponent, ItemsetComponent, ItemTypeComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    NgxDatatableModule,
    FormsModule,
    NgbModule,
     NgSelectModule,
    CoreSidebarModule,
    ReactiveFormsModule,
  ]
})
export class MasterModule { }


   

