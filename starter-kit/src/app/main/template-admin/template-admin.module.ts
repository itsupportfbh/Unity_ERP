import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TemplateAdminComponent } from './template-admin.component';

const routes: Routes = [
  {
    path: '',
    component: TemplateAdminComponent,
    data: { animation: 'templateAdmin' }
  }
];

@NgModule({
  declarations: [TemplateAdminComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)]
})
export class TemplateAdminModule {}
