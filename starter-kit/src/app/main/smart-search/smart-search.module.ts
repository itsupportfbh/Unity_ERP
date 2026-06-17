import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SmartSearchComponent } from './smart-search.component';

const routes: Routes = [
  {
    path: '',
    component: SmartSearchComponent,
    data: { animation: 'smartSearch' }
  }
];

@NgModule({
  declarations: [SmartSearchComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)]
})
export class SmartSearchModule {}
