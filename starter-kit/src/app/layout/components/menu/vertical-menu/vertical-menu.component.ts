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

    // ✅ prevent "Menu with key 'main' already exists"
    try { this._coreMenuService.unregister('main'); } catch {}

    this._coreMenuService.register('main', filtered);
    this._coreMenuService.setCurrentMenu('main');
    this.menu = filtered;

    // close on nav end
    this._router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this._unsubscribeAll))
      .subscribe(() => this._coreSidebarService.getSidebarRegistry('menu')?.close());

    // scroll to active once
    this._router.events
      .pipe(filter(e => e instanceof NavigationEnd), take(1))
      .subscribe(() => setTimeout(() => this.directiveRef?.scrollToElement('.navigation .active', -180, 500)));
  }

 private filterMenu(items: any[]): any[] {
  return (items || [])
    .filter(i => this._auth.canShowMenu(i.teams || [], i.approvalRoles || []))
    .map(i => ({
      ...i,
      children: i.children ? this.filterMenu(i.children) : undefined
    }))
    .filter(i => i.type !== 'collapsible' || (i.children && i.children.length));
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
