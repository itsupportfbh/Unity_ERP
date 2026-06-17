import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextareaAutosizeDirective } from './textarea-autosize.directive';
import { HasPermissionDirective } from './has-permission.directive';


@NgModule({
  declarations: [TextareaAutosizeDirective, HasPermissionDirective],
  imports: [CommonModule, FormsModule],
  exports: [TextareaAutosizeDirective, HasPermissionDirective]
})
export class SharedModule {}
