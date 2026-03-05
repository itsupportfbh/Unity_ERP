import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { CoreMenuService } from '@core/components/core-menu/core-menu.service';

@Component({
  selector: '[core-menu]',
  templateUrl: './core-menu.component.html',
  encapsulation: ViewEncapsulation.None
})
export class CoreMenuComponent implements OnInit, OnDestroy {
  @Input() layout: 'vertical' | 'horizontal' = 'vertical';

  menu: any[] = [];
  private _destroy$ = new Subject<void>();

  constructor(private _router: Router, private _coreMenuService: CoreMenuService) {}

  ngOnInit(): void {
    // 1) initial
    this.refreshMenu(this._router.url);

    // 2) whenever menu changed (register/setCurrentMenu)
    this._coreMenuService.onMenuChanged
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => setTimeout(() => this.refreshMenu(this._router.url), 0));

    // 3) on navigation
    this._router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this._destroy$))
      .subscribe((e: any) => {
        const url = e?.urlAfterRedirects || e?.url || this._router.url;
        setTimeout(() => this.refreshMenu(url), 0);
      });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  // ---------------- UI actions ----------------
  toggle(node: any): void {
    // manual toggle
    node.open = !node.open;
    node.isOpen = node.open;
  }

  // ---------------- refresh ----------------
  private refreshMenu(url: string): void {
    const current = this.normalize(url);

    const raw = this._coreMenuService.getCurrentMenu() || [];
    const cloned = this.clone(raw);

    this.menu = this.applyActiveFlags(cloned, current);
  }

  // ---------------- matching ----------------
  private normalize(u: string): string {
    return (u || '').split('?')[0].split('#')[0].toLowerCase();
  }

  private matchPath(current: string, base: string): boolean {
    const b = (base || '').toLowerCase();
    if (!b) return false;

    // exact (/purchase/list-purchaseorder)
    if (current === b) return true;

    // param paths (/purchase/edit-purchaseorder/12)
    // also supports deeper child (/x/y/z)
    if (current.startsWith(b + '/')) return true;

    return false;
  }

  private isNodeMatch(current: string, node: any): boolean {
    const url = (node?.url || '').toLowerCase();
    const activeUrls: string[] = (node?.activeUrls || []).map((x: any) => String(x || '').toLowerCase());

    if (this.matchPath(current, url)) return true;
    for (const a of activeUrls) {
      if (this.matchPath(current, a)) return true;
    }
    return false;
  }

  // ---------------- active/open flags ----------------
  private applyActiveFlags(items: any[], current: string): any[] {
    const walk = (list: any[]): any[] => {
      return (list || [])
        .filter(x => !x?.hidden) // hide hidden menu entries
        .map(node => {
          const n: any = { ...node };

          // reset
          n.active = false;
          n.isActive = false;
          n.open = false;
          n.isOpen = false;

          // children first
          if (Array.isArray(n.children) && n.children.length) {
            n.children = walk(n.children);

            const anyChildActive = n.children.some((c: any) => c.active || c.isActive);
            const anyChildOpen = n.children.some((c: any) => c.open || c.isOpen);

            if (anyChildActive || anyChildOpen) {
              n.open = true;
              n.isOpen = true;

              // ✅ optional: parent also can be shown as active (like Vuexy)
              n.active = true;
              n.isActive = true;
            }
          }

          // leaf match
          if (n.type === 'item' && this.isNodeMatch(current, n)) {
            n.active = true;
            n.isActive = true;
          }

          // collapsible itself might have url too (rare)
          if (n.type === 'collapsible' && this.isNodeMatch(current, n)) {
            n.open = true;
            n.isOpen = true;
            n.active = true;
            n.isActive = true;
          }

          return n;
        });
    };

    return walk(items || []);
  }

  private clone<T>(x: T): T {
    return JSON.parse(JSON.stringify(x));
  }
}