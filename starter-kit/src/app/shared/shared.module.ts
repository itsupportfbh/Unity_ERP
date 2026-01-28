import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextareaAutosizeDirective } from './textarea-autosize.directive';


@NgModule({
  declarations: [TextareaAutosizeDirective],
  imports: [CommonModule, FormsModule],
  exports: [TextareaAutosizeDirective]
})
export class SharedModule {}
