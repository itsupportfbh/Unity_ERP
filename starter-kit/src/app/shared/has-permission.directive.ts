import { Directive, ElementRef, Input, OnChanges, Renderer2, SimpleChanges } from '@angular/core';
import { FunctionPermission, PermissionAction, PermissionService } from './permission.service';

@Directive({
  selector: '[appHasPermission]'
})
export class HasPermissionDirective implements OnChanges {
  @Input('appHasPermission') permission: FunctionPermission | null | undefined;
  @Input() permissionAction: PermissionAction = 'view';
  @Input() permissionMode: 'hide' | 'disable' = 'hide';

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private permissionService: PermissionService
  ) {}

  ngOnChanges(_: SimpleChanges): void {
    const allowed = this.permissionService.has(this.permission, this.permissionAction);
    const element = this.elementRef.nativeElement;

    if (this.permissionMode === 'disable') {
      this.renderer.setStyle(element, 'display', '');
      this.renderer.setProperty(element, 'disabled', !allowed);
      this.renderer.setAttribute(element, 'aria-disabled', String(!allowed));
      return;
    }

    this.renderer.setStyle(element, 'display', allowed ? '' : 'none');
  }
}
