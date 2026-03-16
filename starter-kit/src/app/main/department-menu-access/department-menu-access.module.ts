import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { DepartmentMenuAccessComponent } from './department-menu-access-create/department-menu-access.component';
import { DepartmentMenuAccessListComponent } from './department-menu-access-list/department-menu-access-list.component';

const routes: Routes = [
  {
    path: '',
    component: DepartmentMenuAccessListComponent
  },
  {
    path: 'create',
    component: DepartmentMenuAccessComponent
  },
  {
    path: 'edit/:departmentId',
    component: DepartmentMenuAccessComponent
  }
];

@NgModule({
  declarations: [
    DepartmentMenuAccessComponent,
    DepartmentMenuAccessListComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    NgxDatatableModule,
    NgbModule
  ]
})
export class DepartmentMenuAccessModule { }