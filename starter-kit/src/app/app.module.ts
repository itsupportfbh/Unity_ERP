import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

import 'hammerjs';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrModule } from 'ngx-toastr';

import { CoreModule } from '@core/core.module';
import { CoreCommonModule } from '@core/common.module';
import { CoreSidebarModule, CoreThemeCustomizerModule } from '@core/components';

import { coreConfig } from 'app/app-config';

import { AppComponent } from 'app/app.component';
import { LayoutModule } from 'app/layout/layout.module';
import { SampleModule } from 'app/main/sample/sample.module';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ChartofaccountComponent } from './main/financial/chartofaccount/chartofaccount-list/chartofaccount.component';
import { SupplierComponent } from './main/businessPartners/supplier/supplier.component';
import { AuthGuard } from './auth/helpers';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { MobileLinkInterceptor} from './main/purchase/mobile-receiving/mr-token.interceptor';
import { RecipemastercreateComponent } from './main/Recipe/recipemastercreate/recipemastercreate.component';


const appRoutes: Routes = [
  {
    path: 'pages',
    loadChildren: () =>
      import('./main/pages/pages.module').then(m => m.PagesModule),
    
  },
  {
    path: 'master',
    loadChildren: () =>
      import('./main/master/master.module').then(m => m.MasterModule),
    
  },
  {
    path: 'purchase',
    loadChildren: () => import('./main/purchase/purchase.module').then(m => m.PurchaseModule),
   
    data: { roles: ['Purchase Team', 'Admin', 'Super Admin'] }
  },

  {
    path: 'Inventory',
    loadChildren: () => import('./main/inventory/inventory.module').then(m => m.InventoryModule),
    
    data: { roles: ['Purchase Team', 'Admin', 'Super Admin'] }
  },
  {
    path: 'financial',
    loadChildren: () => import('./main/financial/financial.module').then(m => m.FinancialModule),
    
    data: { roles: ['Finance Team',  'Super Admin'] }
  },
  {
    path: 'Businesspartners',
    loadChildren: () => import('./main/businessPartners/businesspartners.module').then(m => m.BusinesspartnersModule),
    
  },
  {
    path: 'Sales',
    loadChildren: () => import('./main/sales/sales.module').then(m => m.SalesModule),
    
     data: { roles: ['Sales Team', 'Admin', 'Super Admin'] }
  },
  {
    path: 'Recipe',
    loadChildren: () => import('./main/Recipe/recipe.module').then(m => m.RecipeModule),
    
  },
  {
    path: 'admin/users',
    loadChildren: () => import('./main/user/user.module').then(m => m.UserModule),
   
  },
  {
    path: '',
    redirectTo: 'pages/authentication/login-v2',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/pages/miscellaneous/error'
  }
];

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    NgxDatatableModule,
    RouterModule.forRoot(appRoutes, {
      scrollPositionRestoration: 'enabled',
      relativeLinkResolution: 'legacy'
    }),
    TranslateModule.forRoot(),
    NgbModule,
    ToastrModule.forRoot(),
    CoreModule.forRoot(coreConfig),
    CoreCommonModule,
    CoreSidebarModule,
    CoreThemeCustomizerModule,
    LayoutModule,
    SampleModule
    // ❌ Removed MasterModule from here
  ],
  bootstrap: [AppComponent],
   providers: [
    { provide: HTTP_INTERCEPTORS, useClass: MobileLinkInterceptor, multi: true }
  ]
})
export class AppModule { }
