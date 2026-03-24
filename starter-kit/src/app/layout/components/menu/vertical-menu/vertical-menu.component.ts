import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { PerfectScrollbarDirective } from 'ngx-perfect-scrollbar';

import { CoreConfigService } from '@core/services/config.service';
import { CoreMenuService } from '@core/components/core-menu/core-menu.service';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';

import { ALL_MENU } from 'app/menu/menu';
import { AuthService } from 'app/main/pages/authentication/auth-service';

@Component({
  selector: 'vertical-menu',
  templateUrl: './vertical-menu.component.html',
  styleUrls: ['./vertical-menu.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class VerticalMenuComponent implements OnInit, OnDestroy {
  coreConfig: any;
  menu: any[] = [];
  isCollapsed = false;
  isScrolled = false;

  private _unsubscribeAll = new Subject<any>();

  @ViewChild(PerfectScrollbarDirective, { static: false })
  directiveRef?: PerfectScrollbarDirective;

  constructor(
    private _coreConfigService: CoreConfigService,
    private _coreMenuService: CoreMenuService,
    private _coreSidebarService: CoreSidebarService,
    private _router: Router,
    private _auth: AuthService
  ) {}

  ngOnInit(): void {
    this._coreConfigService.config
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(config => {
        this.coreConfig = config;
      });

    this.isCollapsed = !!this._coreSidebarService.getSidebarRegistry('menu')?.collapsed;

    this.loadMenu(this._router.url);

    this._router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this._unsubscribeAll)
      )
      .subscribe((event: any) => {
        const url = event?.urlAfterRedirects || event?.url || this._router.url;
        this.loadMenu(url);
        this._coreSidebarService.getSidebarRegistry('menu')?.close();
      });
  }

  private loadMenu(url?: string): void {
    const currentUrl = url || this._router.url || '/home';

    const filtered = this.filterMenu(ALL_MENU);
    const marked = this.markActiveMenu(filtered, currentUrl);

    console.log('menuIds =>', this.getAllowedMenuIds());
    console.log('approvalRoles =>', this.getApprovalRoles());
    console.log('filtered =>', filtered);
    console.log('marked =>', marked);

    this.menu = marked;

    try {
      this._coreMenuService.unregister('main');
    } catch {}

    try {
      this._coreMenuService.register('main', this.menu);
      this._coreMenuService.setCurrentMenu('main');
    } catch (err) {
      console.error('Core menu register error =>', err);
    }
  }

  private getAllowedMenuIds(): string[] {
    try {
      const raw = localStorage.getItem('menuIds');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private getApprovalRoles(): string[] {
    try {
      const raw = localStorage.getItem('approvalRoles');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private filterMenu(items: any[], parentAllowed: boolean = false): any[] {
    const allowedMenuIds = this.getAllowedMenuIds();
    const approvalRoles = this.getApprovalRoles();

    return (items || [])
      .map(item => {
        const selfAllowed = parentAllowed || allowedMenuIds.includes(item.id);

        const hasTeamRules = Array.isArray(item.teams) && item.teams.length > 0;
        const hasApprovalRules = Array.isArray(item.approvalRoles) && item.approvalRoles.length > 0;

        const authAllowed =
          !hasTeamRules && !hasApprovalRules
            ? true
            : this._auth.canShowMenu(item.teams || [], item.approvalRoles || []);

        const superAdminExtraAccess =
          item.id === 'department-menu-access' &&
          approvalRoles.includes('Super Admin');

        const children = item.children
          ? this.filterMenu(item.children, selfAllowed )
          : undefined;

        const hasVisibleChildren = Array.isArray(children) && children.length > 0;

        const finalAllowed =
          authAllowed &&
          (selfAllowed  || hasVisibleChildren ||superAdminExtraAccess);

        if (!finalAllowed) {
          return null;
        }

        return {
          ...item,
          children
        };
      })
      .filter((x: any) => x !== null)
      .filter((item: any) => {
        if (item.type !== 'collapsible') return true;
        return Array.isArray(item.children) && item.children.length > 0;
      });
  }

  private markActiveMenu(items: any[], currentUrl: string): any[] {
    const current = (currentUrl || '')
      .split('?')[0]
      .split('#')[0]
      .toLowerCase();

    const walk = (list: any[]): any[] => {
      return (list || []).map(node => {
        const n = { ...node };

        n.active = false;
        n.isActive = false;
        n.open = false;
        n.isOpen = false;

        if (n.children && n.children.length) {
          n.children = walk(n.children);

          const childActive = n.children.some(
            (c: any) => c.active || c.isActive || c.open || c.isOpen
          );

          if (childActive) {
            n.open = true;
            n.isOpen = true;
            n.active = true;
            n.isActive = true;
          }
        }

        const url = (n.url || '').toLowerCase();
        const activeUrls: string[] = (n.activeUrls || []).map((x: string) =>
          (x || '').toLowerCase()
        );

        const matchUrl = (u: string) => {
          if (!u) return false;
          return current === u || current.startsWith(u + '/');
        };

        const isMatch = matchUrl(url) || activeUrls.some(a => matchUrl(a));

        if (isMatch) {
          n.active = true;
          n.isActive = true;

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
    this._coreConfigService
      .getConfig()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(config => {
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