import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ChartofaccountComponent } from './chartofaccount/chartofaccount-list/chartofaccount.component';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { CoreSidebarModule } from '@core/components';
import { JournalComponent } from './journal/journal/journal.component';
import { ChartOfAccountCreateComponent } from './chartofaccount/chartofaccountcreate/chartofaccountcreate.component';
import { NgSelectModule } from '@ng-select/ng-select';

import { FinanceTaxcodesComponent } from './tax-gst/finance-taxcodes/finance-taxcodes.component';
import { FinanceGstreturnsComponent } from './tax-gst/finance-gstreturns/finance-gstreturns.component';
import { FinanceGstdetailsComponent } from './tax-gst/finance-gstdetails/finance-gstdetails.component';
import { TaxGstComponent } from './tax-gst/taxmain/tax-gst.component';
import { CreateJournalComponent } from './journal/create-journal/create-journal.component';
import { AccountsPayableComponent } from './accounts-payable/accounts-payable.component';
import { InvoiceComponent } from './AR/Invoice/invoice/invoice.component';
import { ReceiptComponent } from './AR/Receipt/receipt/receipt.component';
import { ARCombineComponent } from './AR/AR-Component/ar-combine/ar-combine.component';
import { ReceiptCreateComponent } from './AR/Receipt/receipt-create/receipt-create.component';
import { InvoiceCreateComponent } from './AR/Invoice/invoice-create/invoice-create.component';
import { GeneralLdegerComponent } from './general-ldeger/general-ledgerlist/general-ldeger.component';
import { AgingComponent } from './AR/Aging/aging/aging.component';
import { PeriodCloseFxComponent } from './period-close-fx/period-close-fx.component';
import { InvoiceEmailComponent } from './invoice-email/invoice-email.component';
import { TrialBalanceReportComponent } from './reports/trial-balance-report/trial-balance-report.component';
import { ProfitlossReportComponent } from './profitloss-report/profitloss-report-list/profitloss-report.component';
import { BalanceSheetComponent } from './balance-sheet/balance-sheet/balance-sheet.component';
import { FinancereportsComponent } from './financereports/financereports.component';
import { GstReportComponent } from './gst-report/gst-report/gst-report.component';
import { APAgingComponent } from './reports/ap-aging/ap-aging.component';
import { ArApAgingComponent } from './reports/ar/ap-aging/ap-aging.component';
import { DaybookReportComponent } from './daybook/daybook-report/daybook-report.component';
import { CollectionForecastComponent } from './reports/collection-forecast/collection-forecast.component';
import { OpeningBalanceComponent } from './opening-balance/opening-balance/opening-balance.component';
import { ArAdvanceComponent } from './AR/ar-advance/ar-advance.component';
import { ApAdvanceComponent } from './accounts-payable/ap-advance/ap-advance.component';

const routes: Routes = [
  { path: 'ChartOfAccount', component: ChartofaccountComponent },
  { path: 'journal', component: JournalComponent },
  { path: 'create-journal', component: CreateJournalComponent },
  { path: 'tax-gst', component: TaxGstComponent },
  { path: 'AccountPayable', component: AccountsPayableComponent },
  { path: 'AR', component: ARCombineComponent },
  { path: 'AR-invoice', component: InvoiceComponent },
  { path: 'AR-invoice-create', component: InvoiceCreateComponent },
  { path: 'AR-receipt', component: ReceiptComponent },
  { path: 'AR-receipt-create', component: ReceiptCreateComponent },
  { path: 'AR-receipt-edit/:id', component: ReceiptCreateComponent },
    { path: 'ledger', component: GeneralLdegerComponent },
{ path: 'Period-close', component: PeriodCloseFxComponent },
{ path: 'Invoice-email', component: InvoiceEmailComponent },
{ path: 'report', component: TrialBalanceReportComponent },
{ path: 'profitloss', component: ProfitlossReportComponent },
{ path: 'balance-sheet', component: BalanceSheetComponent },
{ path: 'finance-report', component: FinancereportsComponent },
{ path: 'Gst-report', component: GstReportComponent },
{ path: 'aging', component: ArApAgingComponent },
{ path: 'daybook', component: DaybookReportComponent },
{ path: 'forecast', component: CollectionForecastComponent },
{ path: 'opening-balance', component: OpeningBalanceComponent },
{ path: 'ap-aging', component: APAgingComponent },
{ path: 'ap-advance', component: ApAdvanceComponent },
{ path: 'ar-advance', component: ArAdvanceComponent },
];

@NgModule({
  declarations: [
    ChartofaccountComponent,
    ChartOfAccountCreateComponent,
    JournalComponent,
    TaxGstComponent,
    FinanceTaxcodesComponent,
    FinanceGstreturnsComponent,
    FinanceGstdetailsComponent,
    CreateJournalComponent,
    InvoiceComponent,
    ReceiptComponent,
    ARCombineComponent,
    ReceiptCreateComponent,
    InvoiceCreateComponent,
    GeneralLdegerComponent,
    AgingComponent,
    PeriodCloseFxComponent,
    InvoiceEmailComponent,
    TrialBalanceReportComponent,
    ProfitlossReportComponent,
    BalanceSheetComponent,
    FinancereportsComponent,
    GstReportComponent,
    APAgingComponent,
    ArApAgingComponent,
    DaybookReportComponent,
    CollectionForecastComponent,
    OpeningBalanceComponent,
    AccountsPayableComponent,
   ArAdvanceComponent,
   ApAdvanceComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    NgxDatatableModule,
    FormsModule,
    NgbModule,
    CoreSidebarModule,
    ReactiveFormsModule,
    NgSelectModule,
  ]
})
export class FinancialModule { }
