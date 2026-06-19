import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { ALL_MENU } from 'app/menu/menu';
import { UserService } from '../user.service';

type PermissionCol = 'V' | 'C' | 'E' | 'D' | 'S' | 'A' | 'R' | 'N' | 'X' | 'P' | 'M';

interface ModuleTab {
  id: string;
  title: string;
  items: Array<{ id: string; title: string; url?: string }>;
}

interface PermRow {
  id: string;
  moduleId: string;
  moduleTitle: string;
  functionId: string;
  functionTitle: string;
  flags: Record<PermissionCol, boolean>;
}

@Component({
  selector: 'app-roles-permissions',
  templateUrl: './roles-permissions.component.html',
  styleUrls: ['./roles-permissions.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class RolesPermissionsComponent implements OnChanges {
  @Input() departmentId: number | null = null;
  @Input() userId: number | null = null;
  @Input() teamName: string = '';
  @Input() departmentName: string = '';
  @Input() selectedRoleNames: string[] = [];

  @Output() previousStep = new EventEmitter<void>();
  @Output() nextStep = new EventEmitter<void>();

  permCols: PermissionCol[] = ['V', 'C', 'E', 'D', 'S', 'A', 'R', 'N', 'X', 'P', 'M'];

  modules: ModuleTab[] = [];
  activeModuleId = '';
  rows: PermRow[] = [];
  allowedMenuIds: string[] = [];
  loadingMenus = false;

  constructor(private userSvc: UserService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['departmentId'] || changes['selectedRoleNames'] || changes['userId']) {
      this.loadDepartmentMenus();
    }
  }

private loadDepartmentMenus(): void {
  this.allowedMenuIds = [];
  this.modules = [];
  this.rows = [];
  this.activeModuleId = '';

  if (!this.departmentId) {
    this.loadingMenus = false;
    return;
  }

  this.loadingMenus = true;

  this.userSvc.getDepartmentMenuAccess(this.departmentId).subscribe({
    next: (res: any) => {

      const menuIds = res?.menuIds || res?.data?.menuIds || [];

      this.allowedMenuIds = Array.isArray(menuIds)
        ? menuIds
            .filter((x: any) => !!x)
            .map((x: any) => String(x).trim().toLowerCase())
        : [];


      this.rebuildScreen();
      this.loadingMenus = false;
    },
    error: (err) => {
      console.error('Department menu access load failed:', err);
      this.allowedMenuIds = [];
      this.rebuildScreen();
      this.loadingMenus = false;
    }
  });
}
  private rebuildScreen(): void {
    this.modules = this.buildAllowedModulesFromDepartment(
      ALL_MENU as any[],
      this.allowedMenuIds,
      this.selectedRoleNames
    );

    this.activeModuleId = this.modules[0]?.id || '';
    this.rows = this.makeRows(this.modules);

    if (this.userId) {
      this.patchSavedPermissions();
    }
  }

  private patchSavedPermissions(): void {
    if (!this.userId) return;

    this.userSvc.getOrganizationRoleByUserId(this.userId).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        const jsonText = data?.rolesJSON || data?.RolesJSON;

        if (!jsonText) return;

        let saved: any[] = [];
        try {
          saved = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
        } catch {
          saved = [];
        }

        if (!Array.isArray(saved) || !saved.length) return;

        this.rows = this.rows.map(r => {
          const found = saved.find(x =>
            String(x.FunctionId || x.functionId || '').toLowerCase() === String(r.functionId).toLowerCase() &&
            String(x.ModuleId || x.moduleId || '').toLowerCase() === String(r.moduleId).toLowerCase()
          );

          if (!found) return r;

          const p = found.Permissions || found.permissions || {};

          return {
            ...r,
            flags: {
  V: !!(p.View ?? p.view),
  C: !!(p.Create ?? p.create),
  E: !!(p.Edit ?? p.edit),
  D: !!(p.Delete ?? p.delete),
  S: !!(p.Submit ?? p.submit),
  A: !!(p.Approve ?? p.approve),
  R: !!(p.Reject ?? p.reject),
  N: !!(p.Cancel ?? p.cancel),
  X: !!(p.Export ?? p.export),
  P: !!(p.Print ?? p.print),
  M: !!(p.Post ?? p.post ?? p.Finalize ?? p.finalize)
}
          };
        });
      }
    });
  }

  get visibleRows(): PermRow[] {
    return this.rows.filter(r => r.moduleId === this.activeModuleId);
  }

  setModule(id: string): void {
    this.activeModuleId = id;
  }

  toggleCell(rowId: string, col: PermissionCol): void {
    this.rows = this.rows.map(r =>
      r.id !== rowId
        ? r
        : ({ ...r, flags: { ...r.flags, [col]: !r.flags[col] } })
    );
  }

  allColState(col: PermissionCol): boolean {
    const list = this.visibleRows;
    if (!list.length) return false;
    return list.every(r => !!r.flags[col]);
  }

  toggleAllCol(col: PermissionCol): void {
    const next = !this.allColState(col);

    this.rows = this.rows.map(r => {
      if (r.moduleId !== this.activeModuleId) return r;
      return { ...r, flags: { ...r.flags, [col]: next } };
    });
  }

  reset(): void {
    this.rows = this.makeRows(this.modules);

    if (this.userId) {
      this.patchSavedPermissions();
    }
  }

  goPrevious(): void {
    this.previousStep.emit();
  }

  goNext(): void {
    this.nextStep.emit();
  }

getPermissionPayload(): any[] {
  return this.rows.map(r => ({
    moduleId: r.moduleId,
    moduleTitle: r.moduleTitle,
    functionId: r.functionId,
    functionTitle: r.functionTitle,
    flags: {
      V: r.flags.V === true,
      C: r.flags.C === true,
      E: r.flags.E === true,
      D: r.flags.D === true,
      S: r.flags.S === true,
      A: r.flags.A === true,
      R: r.flags.R === true,
      N: r.flags.N === true,
      X: r.flags.X === true,
      P: r.flags.P === true,
      M: r.flags.M === true
    }
  }));
}
  private isAllowedByRole(item: any, roleNames: string[]): boolean {
    const approvalRoles: string[] = item?.approvalRoles || [];
    if (!approvalRoles.length) return true;
    return (roleNames || []).some(r => approvalRoles.includes(r));
  }

private flattenMenuItems(items: any[], allowedSet: Set<string>, roleNames: string[], parentAllowed: boolean): any[] {
  const out: any[] = [];

  (items || []).forEach((item: any) => {
    if (!item || item.hidden) return;

    const itemId = String(item.id || '').trim().toLowerCase();
    const roleAllowed = this.isAllowedByRole(item, roleNames);
    if (!roleAllowed) return;

    const currentAllowed = parentAllowed || allowedSet.has(itemId);

    // menu item / child item
    if (currentAllowed && item.type !== 'collapsible') {
      out.push({
        id: item.id,
        title: item.title,
        url: item.url
      });
    }

    // internal nested children
    if (item.children && item.children.length) {
      out.push(
        ...this.flattenMenuItems(
          item.children,
          allowedSet,
          roleNames,
          currentAllowed
        )
      );
    }
  });

  return out;
}

private buildAllowedModulesFromDepartment(
  menuArr: any[],
  allowedMenuIds: string[],
  roleNames: string[]
): ModuleTab[] {
  const allowedSet = new Set(
    (allowedMenuIds || []).map(x => String(x).trim().toLowerCase())
  );

  const topLevelItems = (menuArr || [])
    .filter(item => item && !item.hidden && item.type !== 'collapsible')
    .filter(item => {
      const itemId = String(item.id || '').trim().toLowerCase();
      return allowedSet.has(itemId) && this.isAllowedByRole(item, roleNames);
    })
    .map(item => ({
      id: item.id,
      title: item.title,
      url: item.url
    }));

  const topLevelModule = topLevelItems.length
    ? [{
        id: 'general',
        title: 'General',
        items: topLevelItems
      } as ModuleTab]
    : [];

  const parents = (menuArr || []).filter(x => x.type === 'collapsible' && !x.hidden);

  const moduleTabs = parents
    .map(parent => {
      const parentId = String(parent.id || '').trim().toLowerCase();
      const parentAllowed = allowedSet.has(parentId);

      if (!this.isAllowedByRole(parent, roleNames)) return null;

      const children = this.flattenMenuItems(
        parent.children || [],
        allowedSet,
        roleNames,
        parentAllowed
      );

      if (!children.length) return null;

      return {
        id: parent.id,
        title: parent.title,
        items: children
      } as ModuleTab;
    })
    .filter((x): x is ModuleTab => !!x);

  return [
    ...topLevelModule,
    ...moduleTabs
  ];
}

  private makeEmptyFlags(): Record<PermissionCol, boolean> {
    return this.permCols.reduce((acc, c) => {
      acc[c] = false;
      return acc;
    }, {} as Record<PermissionCol, boolean>);
  }

  private makeRows(mods: ModuleTab[]): PermRow[] {
    const out: PermRow[] = [];

    mods.forEach(m => {
      m.items.forEach(it => {
        const flags = this.makeEmptyFlags();
        flags.V = true;

        out.push({
          id: `${m.id}:${it.id}`,
          moduleId: m.id,
          moduleTitle: m.title,
          functionId: it.id,
          functionTitle: it.title,
          flags
        });
      });
    });

    return out;
  }
}
