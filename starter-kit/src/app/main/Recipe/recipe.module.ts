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
import { BatchProductionCreateComponent } from './batch-production/batch-production-create/batch-production-create.component';
import { BatchProductionListComponent } from './batch-production/batch-production-list/batch-production-list.component';

const routes: Routes = [
  { path: 'recipecreate', component: RecipemastercreateComponent },
 { path: 'recipelist', component: RecipeMasterListComponent },
  { path: 'recipeedit/:id', component: RecipemastercreateComponent },
  { path: 'productionplanningcreate', component: ProductionPlanningComponent },
  { path: 'productionplanninglist', component: ProductionPlanningListComponent },
  { path: 'productionplanningedit/:id', component: ProductionPlanningComponent },
   { path: 'batchproductionlist', component: BatchProductionListComponent },
  { path: 'batchproductioncreate', component: BatchProductionCreateComponent },
   { path: 'batchproductionedit/:id', component: BatchProductionCreateComponent },
];

@NgModule({
  declarations: [RecipemastercreateComponent, RecipeMasterListComponent, ProductionPlanningComponent, ProductionPlanningListComponent, BatchProductionCreateComponent, BatchProductionListComponent],
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
