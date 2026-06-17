import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ReportBuilderComponent } from './report-builder.component';

const routes: Routes = [
  {
    path: '',
    component: ReportBuilderComponent,
    data: { animation: 'reportBuilder' }
  }
];

@NgModule({
  declarations: [ReportBuilderComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)]
})
export class ReportBuilderModule {}
