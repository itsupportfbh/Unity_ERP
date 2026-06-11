import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';  // ✅ add
import { OcruploadmodalComponent } from '../ocruploadmodal/ocruploadmodal.component';


@NgModule({
  declarations: [OcruploadmodalComponent],
  imports: [
    CommonModule,
    FormsModule,
    NgSelectModule  // ✅ add
  ],
  exports: [OcruploadmodalComponent]
})
export class OcrSharedModule {}