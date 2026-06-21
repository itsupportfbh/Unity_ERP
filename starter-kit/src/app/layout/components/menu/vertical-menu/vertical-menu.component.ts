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
  originalMenu: any[] = [];

  menuSearch: string = '';

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

    this.isCollapsed =
      !!this._coreSidebarService.getSidebarRegistry('menu')?.collapsed;

    this.loadMenu(this._router.url);

    window.addEventListener(
      'menu-permission-updated',
      this.onMenuPermissionUpdated
    );

    this._router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this._unsubscribeAll)
      )
      .subscribe((event: any) => {
        const url = event?.urlAfterRedirects || event?.url || this._router.url;

        this.menuSearch = '';
        this.loadMenu(url);

        this._coreSidebarService.getSidebarRegistry('menu')?.close();
      });
  }

  private onMenuPermissionUpdated = () => {
    this.menuSearch = '';
    this.loadMenu(this._router.url);
  };

  private loadMenu(url?: string): void {
    const currentUrl = url || this._router.url || '/home';

    const filtered = this.filterMenu(ALL_MENU);
    const marked = this.markActiveMenu(filtered, currentUrl);

    this.originalMenu = marked;
    this.menu = this.applyMenuSearch(marked);

    this.refreshCoreMenu();
  }

  onMenuSearchChange(): void {
    this.menu = this.applyMenuSearch(this.originalMenu);
    this.refreshCoreMenu();
  }

  clearMenuSearch(): void {
    this.menuSearch = '';
    this.menu = this.applyMenuSearch(this.originalMenu);
    this.refreshCoreMenu();
  }

  private refreshCoreMenu(): void {
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

private applyMenuSearch(items: any[]): any[] {
  const search = this.menuSearch.trim().toLowerCase();

  if (!search) {
    return items || [];
  }

  const filterRecursive = (list: any[]): any[] => {
    return (list || [])
      .map(item => {
        const title = String(item.title || '').toLowerCase();
        const id = String(item.id || '').toLowerCase();
        const url = String(item.url || '').toLowerCase();

        const children = item.children
          ? filterRecursive(item.children)
          : [];

        const selfMatched =
          title.includes(search) ||
          id.includes(search) ||
          url.includes(search);

        // ✅ child matched iruntha parent-a show panna vendam
        // matched child-a direct-a return pannum
        if (!selfMatched && children.length > 0) {
          return children;
        }

        if (!selfMatched) {
          return null;
        }

        // ✅ self matched na item mattum show
        return {
          ...item,
          open: false,
          isOpen: false,
          active: false,
          isActive: false,
          children: []
        };
      })
      .reduce((acc: any[], item: any) => {
        if (Array.isArray(item)) {
          acc.push(...item);
        } else if (item) {
          acc.push(item);
        }

        return acc;
      }, []);
  };

  return filterRecursive(items || []);
}

  private getAllowedMenuIds(): string[] {
    try {
      const raw =
        localStorage.getItem('allowedMenuIds') ||
        localStorage.getItem('menuIds');

      const parsed = raw ? JSON.parse(raw) : [];

      return Array.isArray(parsed)
        ? parsed.map((x: any) => String(x).trim().toLowerCase())
        : [];
    } catch {
      return [];
    }
  }

  private getApprovalRoles(): string[] {
    try {
      const raw = localStorage.getItem('approvalRoles');
      const parsed = raw ? JSON.parse(raw) : [];

      return Array.isArray(parsed)
        ? parsed.map((x: any) => String(x).trim())
        : [];
    } catch {
      return [];
    }
  }

  private filterMenu(items: any[]): any[] {
    const allowedMenuIds = this.getAllowedMenuIds();

    const allowedSet = new Set(
      (allowedMenuIds || []).map(x => String(x).trim().toLowerCase())
    );

    return (items || [])
      .map(item => {
        if (item.hidden === true) {
          return null;
        }

        const itemId = String(item.id || '').trim().toLowerCase();

        const isDepartmentMenuAccess = itemId === 'department-menu-access';

        const children = item.children
          ? this.filterMenu(item.children)
          : undefined;

        const hasVisibleChildren =
          Array.isArray(children) && children.length > 0;

        const selfAllowed =
          allowedSet.has(itemId) ||
          this.isNewPurchaseMenuAllowedByParent(itemId, allowedSet);

        const hasTeamRules =
          Array.isArray(item.teams) && item.teams.length > 0;

        const hasApprovalRules =
          Array.isArray(item.approvalRoles) &&
          item.approvalRoles.length > 0;

        const authAllowed =
          !hasTeamRules && !hasApprovalRules
            ? true
            : this._auth.canShowMenu(
                item.teams || [],
                item.approvalRoles || []
              );

        const finalAllowed =
          isDepartmentMenuAccess ||
          (
            authAllowed &&
            (selfAllowed || hasVisibleChildren)
          );

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

  private isNewPurchaseMenuAllowedByParent(
    itemId: string,
    allowedSet: Set<string>
  ): boolean {
    const parentPurchaseAllowed = allowedSet.has('purchase');

    const newPurchaseMenuIds = new Set([
      'supplier-scorecard'
    ]);

    return parentPurchaseAllowed && newPurchaseMenuIds.has(itemId);
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

        const isMatch =
          matchUrl(url) || activeUrls.some(a => matchUrl(a));

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
      {
        layout: {
          menu: {
            collapsed: !this.isCollapsed
          }
        }
      },
      { emitEvent: true }
    );
  }

  ngOnDestroy(): void {
    window.removeEventListener(
      'menu-permission-updated',
      this.onMenuPermissionUpdated
    );

    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}