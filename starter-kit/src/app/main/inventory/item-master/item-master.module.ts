import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemMasterListComponent } from './item-master-list/item-master-list.component';
import { CreateItemMasterComponent } from './create-item-master/create-item-master.component';
import { RouterModule } from '@angular/router';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import { NgSelectModule } from '@ng-select/ng-select';



@NgModule({
  declarations: [
   
    CreateItemMasterComponent
  ],
  imports: [
    CommonModule,
      NgxDatatableModule,
        FormsModule,
        NgbModule,
        ReactiveFormsModule,
        SweetAlert2Module.forRoot(),
        NgSelectModule,
  ]
})
export class ItemMasterModule { }
