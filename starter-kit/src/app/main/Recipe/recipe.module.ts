import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { RecipemastercreateComponent } from './recipemastercreate/recipemastercreate.component';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import { NgSelectModule } from '@ng-select/ng-select';
import { CoreCommonModule } from '@core/common.module';
import { CoreSidebarModule } from '@core/components';
import { RecipeMasterListComponent } from './recipe-master-list/recipe-master-list.component';
import { ProductionPlanningComponent } from './production-planning/createproductionplanning/production-planning.component';

import { ProductionPlanningListComponent } from './production-planning/production-planning-list/production-planning-list.component';

const routes: Routes = [
  { path: 'recipecreate', component: RecipemastercreateComponent },
 { path: 'recipelist', component: RecipeMasterListComponent },
  { path: 'recipeedit/:id', component: RecipemastercreateComponent },
  { path: 'productionplanningcreate', component: ProductionPlanningComponent },
  { path: 'productionplanninglist', component: ProductionPlanningListComponent },
  { path: 'productionplanningedit/:id', component: ProductionPlanningComponent },
];

@NgModule({
  declarations: [RecipemastercreateComponent, RecipeMasterListComponent, ProductionPlanningComponent, ProductionPlanningListComponent],
  imports: [
    CommonModule, RouterModule.forChild(routes),
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
export class RecipeModule { }
