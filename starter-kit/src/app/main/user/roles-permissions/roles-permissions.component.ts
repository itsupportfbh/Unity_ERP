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

type PermissionCol = 'V' | 'C' | 'E' | 'D' | 'A' | 'R' | 'X' | 'P' | 'M';

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

  permCols: PermissionCol[] = ['V', 'C', 'E', 'D', 'A', 'R', 'X', 'P', 'M'];

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

    if (!this.departmentId) return;

    this.loadingMenus = true;

    this.userSvc.getDepartmentMenuAccess(this.departmentId).subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];

        this.allowedMenuIds = (data || [])
          .map((x: any) => (typeof x === 'string' ? x : x.menuId || x.MenuId || x.id))
          .filter((x: any) => !!x)
          .map((x: any) => String(x).trim());

        this.rebuildScreen();
      },
      error: () => {
        this.allowedMenuIds = [];
        this.rebuildScreen();
      },
      complete: () => {
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
              V: !!p.View,
              C: !!p.Create,
              E: !!p.Edit,
              D: !!p.Delete,
              A: !!p.Approve,
              R: !!p.Reject,
              X: !!p.Cancel,
              P: !!p.Print,
               M: !!(p.Post ?? p.Finalize ?? p.Export)
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
      flags: r.flags
    }));
  }

  private isAllowedByRole(item: any, roleNames: string[]): boolean {
    const approvalRoles: string[] = item?.approvalRoles || [];
    if (!approvalRoles.length) return true;
    return (roleNames || []).some(r => approvalRoles.includes(r));
  }

private buildAllowedModulesFromDepartment(
  menuArr: any[],
  allowedMenuIds: string[],
  roleNames: string[]
): ModuleTab[] {
  const allowedSet = new Set((allowedMenuIds || []).map(x => String(x).trim().toLowerCase()));
  const parents = (menuArr || []).filter(x => x.type === 'collapsible' && !x.hidden);

  return parents
    .map(parent => {
      const parentId = String(parent.id || '').trim().toLowerCase();
      const parentAllowed = allowedSet.has(parentId);
      const roleAllowedParent = this.isAllowedByRole(parent, roleNames);

      if (!roleAllowedParent) return null;

      const children = (parent.children || [])
        .filter((child: any) => {
          if (!child || child.hidden) return false; // ✅ hidden menu show aaga koodadhu

          const childId = String(child.id || '').trim().toLowerCase();
          const roleAllowedChild = this.isAllowedByRole(child, roleNames);
          if (!roleAllowedChild) return false;

          // parent full access irundhalum hidden child varakoodadhu
          if (parentAllowed) return true;

          return allowedSet.has(childId);
        })
        .map((child: any) => ({
          id: child.id,
          title: child.title,
          url: child.url
        }));

      if (!children.length) return null;

      return {
        id: parent.id,
        title: parent.title,
        items: children
      } as ModuleTab;
    })
    .filter((x): x is ModuleTab => !!x);
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