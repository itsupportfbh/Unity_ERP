import { AfterViewInit, Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  // attaches only to <textarea autosize>
  selector: 'textarea[autosize]'
})
export class TextareaAutosizeDirective implements AfterViewInit {
  @Input('autosizeMaxRows') maxRows?: number;

  private readonly el: HTMLTextAreaElement;

  constructor(private host: ElementRef<HTMLTextAreaElement>) {
    this.el = this.host.nativeElement;
    // Kill the scrollbar & user-resize right away
    this.el.style.overflow = 'hidden';
    this.el.style.resize = 'none';
    this.el.style.boxSizing = 'border-box';
  }

  ngAfterViewInit(): void {
    // Defer a tick so [(ngModel)] has populated existing text
    setTimeout(() => this.resizeToFit(), 0);
  }

  @HostListener('input')
  onInput(): void {
    this.resizeToFit();
  }

  // If using [(ngModel)], Angular triggers 'input' already,
  // but this helps when model changes programmatically.
  @HostListener('ngModelChange')
  onModelChange(): void {
    this.resizeToFit();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.resizeToFit();
  }

  private resizeToFit(): void {
    const ta = this.el;

    // Reset to auto, then grow to scrollHeight
    ta.style.height = 'auto';

    // Hard cap by rows if requested
    if (this.maxRows) {
      const computed = window.getComputedStyle(ta);
      // Fallback line-height: compute from font-size if 'normal'
      let lineHeight = parseFloat(computed.lineHeight);
      if (isNaN(lineHeight)) {
        const fontSize = parseFloat(computed.fontSize || '16');
        lineHeight = fontSize * 1.2;
      }
      const paddingTop = parseFloat(computed.paddingTop || '0');
      const paddingBottom = parseFloat(computed.paddingBottom || '0');
      const borderTop = parseFloat(computed.borderTopWidth || '0');
      const borderBottom = parseFloat(computed.borderBottomWidth || '0');

      const maxPx = (this.maxRows * lineHeight) + paddingTop + paddingBottom + borderTop + borderBottom;
      ta.style.height = Math.min(ta.scrollHeight, maxPx) + 'px';
    } else {
      ta.style.height = ta.scrollHeight + 'px';
    }
  }
}
