import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { LanguageAdminComponent } from './language-admin.component';

const routes: Routes = [
  {
    path: '',
    component: LanguageAdminComponent,
    data: { animation: 'languageAdmin' }
  }
];

@NgModule({
  declarations: [LanguageAdminComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)]
})
export class LanguageAdminModule {}
