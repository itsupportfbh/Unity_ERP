import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CollectionscreateComponent } from './collectionscreate/collectionscreate.component';
import { RouterModule } from '@angular/router';
import { CustomermastercreateComponent } from './customermastercreate/customermastercreate.component';
import { DeliveryordercreateComponent } from './deliveryorder/deliveryordercreate/deliveryordercreate.component';
import { PermissionscreateComponent } from './permissionscreate/permissionscreate.component';
import { PickingPackingcreateComponent } from './picking-packingcreate/picing-packing-create/picking-packingcreate.component';
import { QuotationscreateComponent } from './quotations/quotationscreate/quotationscreate.component';

import { ReturnCreditcreateComponent } from './return-creditcreate/return-creditcreate.component';
import { SalesInvoicecreateComponent } from './sales-invoicecreate/sales-invoicecreate.component';
import { SharedcreateComponent } from './sharedcreate/sharedcreate.component';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import { NgSelectModule } from '@ng-select/ng-select';
import { QuotationlistComponent } from './quotations/quotationlist/quotationlist.component';
import { SalesOrderCreateComponent } from './sales-order/sales-order-create/sales-order-create.component';
import { SalesOrderListComponent } from './sales-order/sales-order-list/sales-order-list.component';
import { PickingPackingListComponent } from './picking-packingcreate/picking-packing-list/picking-packing-list.component';
import { DeliveryorderlistComponent } from './deliveryorder/deliveryorderlist/deliveryorderlist.component';
import { SalesinvoicelistComponent } from './sales-invoicecreate/salesinvoicelist/salesinvoicelist.component';
import { ReportscreateComponent } from './reportscreate/reportscreate/reportscreate.component';
import { ReportsSalesByItemComponent } from './reportscreate/reports-sales-by-item/reports-sales-by-item.component';
import { ReportsAvarageMarginComponent } from './reportscreate/reports-avarage-margin/reports-avarage-margin.component';
import { ReportsDeliveriesComponent } from './reportscreate/reports-deliveries/reports-deliveries.component';
import { ReportsFiltersComponent } from './reportscreate/reports-filters/reports-filters.component';
import { CoreCommonModule } from '@core/common.module';
import { CoreSidebarModule } from '@core/components';
 import { ReturnCreditnoteListComponent } from './return-creditcreate/return-creditnote-list/return-creditnote-list.component';

const routes = [
  {
    path: 'Create-collections',
    component: CollectionscreateComponent,
    data: { animation: 'createcollections' }
  },
   {
    path: 'Create-customer-master',
    component: CustomermastercreateComponent,
    data: { animation: 'createcustomermaster' }
  },
   {
    path: 'Delivery-order-create',
    component: DeliveryordercreateComponent,
    data: { animation: 'deliveryordercreateComponent' }
  },
    {
      path: 'Delivery-order-edit/:id',
      component: DeliveryordercreateComponent,
      
    },
   {
    path: 'Delivery-order-list',
    component: DeliveryorderlistComponent,
    data: { animation: 'deliveryorderlistComponent' }
  },
   {
    path: 'Permission-create',
    component: PermissionscreateComponent,
    data: { animation: 'permissioncreateComponent' }
  },
   {
    path: 'Picking-packing-list',
    component: PickingPackingListComponent,
    data: { animation: 'PickingPackinglistComponent' }
  },
   {
    path: 'Picking-packing-create',
    component: PickingPackingcreateComponent,
    data: { animation: 'PickingPackingcreateComponent' }
  },
  {
      path: 'Picking-packing-edit/:id',
      component: PickingPackingcreateComponent,
      
  },
    {
    path: 'Quotation-create',
    component: QuotationscreateComponent,
    data: { animation: 'QuotationscreateComponent' }
  },
   {
      path: 'Edit-quotation/:id',
      component: QuotationscreateComponent,
      
    },
     {
    path: 'Quotation-list',
    component: QuotationlistComponent,
    data: { animation: 'QuotationlistComponent' }
  },
    {
    path: 'Reports-create',
    component: ReportscreateComponent,
    data: { animation: 'ReportscreateComponent' }
  },
   {
    path: 'Return-credit-list',
    component: ReturnCreditnoteListComponent,
    data: { animation: 'ReturnCreditcreateComponent' }
  },
    {
    path: 'Return-credit-create',
    component: ReturnCreditcreateComponent,
    data: { animation: 'ReturnCreditcreateComponent' }
  },
  
{
    path: 'Return-credit-edit/:id',
    component: ReturnCreditcreateComponent,
    data: { animation: 'ReturnCreditcreateComponent' }
  },

    {
    path: 'sales-Invoice-create',
    component: SalesInvoicecreateComponent,
    data: { animation: 'SalesInvoicecreateComponent' }
  },
  { path: 'sales-invoice/edit/:id', 
    component: SalesInvoicecreateComponent },
   {
    path: 'Sales-Invoice-list',
    component: SalesinvoicelistComponent,
    data: { animation: 'SalesinvoicelistComponent' }
  },
   {
    path: 'Sales-Order-list',
    component: SalesOrderListComponent,
    data: { animation: 'SalesOrderListComponent' }
  },
    {
    path: 'Sales-Order-create',
    component: SalesOrderCreateComponent,
    data: { animation: 'SalesOrderCreateComponent' }
  },

    {
    path: 'Shared-create',
    component: SharedcreateComponent,
    data: { animation: 'SharedcreateComponent' }
  },
      {
    path: 'Sales-Order-edit/:id',
    component: SalesOrderCreateComponent,
    data: { animation: 'SalesOrderEditComponent' }
  },
]

@NgModule({
  declarations: [
    CollectionscreateComponent,
    CustomermastercreateComponent,
    DeliveryordercreateComponent,
    PermissionscreateComponent,
    PickingPackingcreateComponent,
    QuotationscreateComponent,
    ReportscreateComponent,
    ReturnCreditcreateComponent,
    SalesInvoicecreateComponent,
    SalesOrderCreateComponent,
    SharedcreateComponent,
    QuotationlistComponent,
    SalesOrderListComponent,
    PickingPackingListComponent,
    DeliveryorderlistComponent,
    SalesinvoicelistComponent,
    ReportsSalesByItemComponent,
    ReportsAvarageMarginComponent,
    ReportsDeliveriesComponent,
    ReportsFiltersComponent,
     ReturnCreditnoteListComponent,
  ],
  imports: [
    CommonModule,
     RouterModule.forChild(routes),
      NgxDatatableModule,
         FormsModule,
         NgbModule,
         ReactiveFormsModule,
         SweetAlert2Module.forRoot(),
         NgSelectModule,
            CoreCommonModule,
    CoreSidebarModule  
  ]
})
export class SalesModule { }
