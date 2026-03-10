import { Component, OnInit, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { take, takeUntil, filter } from 'rxjs/operators';
import { PerfectScrollbarDirective } from 'ngx-perfect-scrollbar';

import { CoreConfigService } from '@core/services/config.service';
import { CoreMenuService } from '@core/components/core-menu/core-menu.service';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';

import { menu } from 'app/menu/menu';
import { AuthService } from 'app/main/pages/authentication/auth-service';

@Component({
  selector: 'vertical-menu',
  templateUrl: './vertical-menu.component.html',
  styleUrls: ['./vertical-menu.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class VerticalMenuComponent implements OnInit, OnDestroy {
  coreConfig: any;
  menu: any;
  isCollapsed = false;
  isScrolled = false;

  private _unsubscribeAll = new Subject<any>();

  @ViewChild(PerfectScrollbarDirective, { static: false }) directiveRef?: PerfectScrollbarDirective;

  constructor(
    private _coreConfigService: CoreConfigService,
    private _coreMenuService: CoreMenuService,
    private _coreSidebarService: CoreSidebarService,
    private _router: Router,
    private _auth: AuthService
  ) {}

  ngOnInit(): void {
    this._coreConfigService.config.pipe(takeUntil(this._unsubscribeAll)).subscribe(config => {
      this.coreConfig = config;
    });

    this.isCollapsed = !!this._coreSidebarService.getSidebarRegistry('menu')?.collapsed;

    // ✅ FILTER MENU
    const filtered = this.filterMenu(menu);

    // ✅ MARK ACTIVE/OPEN based on current URL (important!)
    const marked = this.markActiveMenu(filtered, this._router.url);

    // ✅ prevent "Menu with key 'main' already exists"
    try { this._coreMenuService.unregister('main'); } catch {}

    this._coreMenuService.register('main', marked);
    this._coreMenuService.setCurrentMenu('main');
    this.menu = marked;

    // ✅ On every navigation: update active/open + close sidebar + scroll to active
    this._router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this._unsubscribeAll))
      .subscribe((e: any) => {
        const url = e?.urlAfterRedirects || e?.url || this._router.url;

        const filtered2 = this.filterMenu(menu);
        const marked2 = this.markActiveMenu(filtered2, url);

        try { this._coreMenuService.unregister('main'); } catch {}
        this._coreMenuService.register('main', marked2);
        this._coreMenuService.setCurrentMenu('main');
        this.menu = marked2;

        // close sidebar (your existing behavior)
        this._coreSidebarService.getSidebarRegistry('menu')?.close();

        // scroll to active
       // setTimeout(() => this.directiveRef?.scrollToElement('.navigation .active', -180, 500), 0);
      });

    // initial scroll once
    // this._router.events
    //   .pipe(filter(e => e instanceof NavigationEnd), take(1))
    //   .subscribe(() => setTimeout(() => this.directiveRef?.scrollToElement('.navigation .active', -180, 500)));
  }

  // ✅ keep your auth filtering
  private filterMenu(items: any[]): any[] {
    return (items || [])
      .filter(i => this._auth.canShowMenu(i.teams || [], i.approvalRoles || []))
      .map(i => ({
        ...i,
        children: i.children ? this.filterMenu(i.children) : undefined
      }))
      .filter(i => i.type !== 'collapsible' || (i.children && i.children.length));
  }

  // ✅ core logic: activeUrls + startsWith match + open parent
  private markActiveMenu(items: any[], currentUrl: string): any[] {
    const current = (currentUrl || '').split('?')[0].split('#')[0].toLowerCase();

    const walk = (list: any[]): any[] => {
      return (list || []).map(node => {
        const n = { ...node };

        // reset flags
        n.active = false; n.isActive = false;
        n.open = false;   n.isOpen = false;

        // recurse
        if (n.children && n.children.length) {
          n.children = walk(n.children);

          // if any child active/open => open parent
      const childActive = n.children.some((c: any) => c.active || c.isActive);

if (childActive) {
  n.open = true;
  n.isOpen = true;

  // ✅ IMPORTANT: highlight parent collapsible too
  n.active = true;
  n.isActive = true;
}
        }

        // determine active for item
        const url = (n.url || '').toLowerCase();
        const activeUrls: string[] = (n.activeUrls || []).map((x: string) => (x || '').toLowerCase());

        const matchUrl = (u: string) => {
          if (!u) return false;
          return current === u || current.startsWith(u + '/');
        };

        const isMatch = matchUrl(url) || activeUrls.some(a => matchUrl(a));

      if (isMatch) {
  // item pages (list/create/edit)
  n.active = true;
  n.isActive = true;

  // if it is collapsible itself, also open it
  if (n.type === 'collapsible') {
    n.open = true;
    n.isOpen = true;
  }
}

        return n;
      });
    };

    return walk(items || []);
  }

  onSidebarScroll(): void {
    const y = Number(this.directiveRef?.position(true)?.y ?? 0);
    this.isScrolled = y > 3;
  }

  toggleSidebar(): void {
    this._coreSidebarService.getSidebarRegistry('menu')?.toggleOpen();
  }

  toggleSidebarCollapsible(): void {
    this._coreConfigService.getConfig().pipe(takeUntil(this._unsubscribeAll)).subscribe(config => {
      this.isCollapsed = config.layout.menu.collapsed;
    });

    this._coreConfigService.setConfig(
      { layout: { menu: { collapsed: !this.isCollapsed } } },
      { emitEvent: true }
    );
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}