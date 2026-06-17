import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { LogisticsComponent } from './logistics.component';

const routes: Routes = [
  {
    path: '',
    component: LogisticsComponent,
    data: { animation: 'logistics' }
  }
];

@NgModule({
  declarations: [LogisticsComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)]
})
export class LogisticsModule {}
