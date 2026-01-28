import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SupplierComponent } from './supplier/supplier.component';
import { CreatesuppliersComponent } from './createsuppliers/createsuppliers.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { NgSelectModule } from '@ng-select/ng-select';
import { CustomerMasterListComponent } from './customer-master/customer-master-list/customer-master-list.component';
import { CreateCustomerMasterComponent } from './customer-master/create-customer-master/create-customer-master.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import { OverlayModule } from '@angular/cdk/overlay';
import { AccountsPayableComponent } from '../financial/accounts-payable/accounts-payable.component';



const routes: Routes = [
  { path: 'supplier', component: SupplierComponent },
  { path: 'supplier/create', component: CreatesuppliersComponent },
  { path: 'supplier/edit/:id', component: CreatesuppliersComponent },
  { path: 'customermaster', component: CustomerMasterListComponent },
  { path: 'customermaster/create', component: CreateCustomerMasterComponent },
  { path: 'customermaster/edit/:id', component: CreateCustomerMasterComponent },
  
  
];
@NgModule({
  declarations: [
    CreatesuppliersComponent,
    SupplierComponent,
    CreateCustomerMasterComponent,
    CustomerMasterListComponent,
    //AccountsPayableComponent
  ],
  imports: [
    CommonModule,
        RouterModule.forChild(routes),
        NgxDatatableModule,
        FormsModule,
        NgbModule,
        ReactiveFormsModule,
        SweetAlert2Module.forRoot(),
        NgSelectModule
        
  ]
})
export class BusinesspartnersModule { }
