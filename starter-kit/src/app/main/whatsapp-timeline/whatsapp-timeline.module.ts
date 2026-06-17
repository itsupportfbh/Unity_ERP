import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { WhatsAppTimelineComponent } from './whatsapp-timeline.component';

const routes: Routes = [
  {
    path: '',
    component: WhatsAppTimelineComponent,
    data: { animation: 'whatsAppTimeline' }
  }
];

@NgModule({
  declarations: [WhatsAppTimelineComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)]
})
export class WhatsAppTimelineModule {}
