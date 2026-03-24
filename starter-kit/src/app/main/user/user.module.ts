import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgSelectModule } from '@ng-select/ng-select';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { UserlistComponent } from './userlist/userlist.component';
import { UserformComponent } from './userform/userform.component';
import { UserAccessWizardComponent } from './user-access-wizard/user-access-wizard.component';
import { RolesPermissionsComponent } from './roles-permissions/roles-permissions.component';

const routes: Routes = [
  { path: '', component: UserlistComponent },

  // old single form routes
  { path: 'new', component: UserformComponent },
  { path: ':id/edit', component: UserformComponent },

  // wizard routes
  { path: 'access', component: UserAccessWizardComponent },
  { path: 'access/:id', component: UserAccessWizardComponent }
];

@NgModule({
  declarations: [
    UserlistComponent,
    UserformComponent,
    UserAccessWizardComponent,
    RolesPermissionsComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),

    FormsModule,            // ✅ needed for [(ngModel)] in RolesPermissions
    ReactiveFormsModule,    // ✅ your user form uses reactive forms

    NgSelectModule,
    NgxDatatableModule,
    NgbModule
  ]
})
export class UserModule { }