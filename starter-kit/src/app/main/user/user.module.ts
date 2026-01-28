import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserlistComponent } from './userlist/userlist.component';
import { UserformComponent } from './userform/userform.component';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

const routes: Routes = [
  { path: '', component: UserlistComponent },
  { path: 'new', component: UserformComponent },
  { path: ':id/edit', component: UserformComponent }
];

@NgModule({
  declarations: [
    UserlistComponent,
    UserformComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    NgxDatatableModule,
        FormsModule,
        NgbModule,
        ReactiveFormsModule,
  ]
})
export class UserModule { }
