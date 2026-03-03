import { Component, Input, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { menu } from 'app/menu/menu'; // ✅ correct path if your menu.ts exported as menu
import { UserService } from '../user.service';

type PermissionCol = 'V'|'C'|'E'|'D'|'S'|'A'|'R'|'X'|'P'|'M';

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

  @Input() teamName: string = '';
  @Input() departmentName: string = '';
  @Input() selectedRoleNames: string[] = [];

  permCols: PermissionCol[] = ['V','C','E','D','S','A','R','X','P','M'];

  users: any[] = [];  // ✅ always ALL users
  companies: any[] = [{ id: 1, name: 'FBH' }];
  filter = { userId: null as any, companyId: null as any, effectiveDate: '' };

  modules: ModuleTab[] = [];
  activeModuleId = '';
  rows: PermRow[] = [];

  constructor(private userSvc: UserService) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.loadAllUsers();

    this.modules = this.buildAllowedModules(menu as any[], this.teamName, this.selectedRoleNames);

    // default focus based on team
    this.activeModuleId = this.pickDefaultModule(this.teamName, this.modules) || (this.modules[0]?.id || '');
    this.rows = this.makeRows(this.modules);
  }

  // ✅ Business Partners / Master requirement: user dropdown always all users
  private loadAllUsers() {
    if (this.users.length) return;

    const anySvc = this.userSvc as any;
    if (anySvc.getAllUsers) {
      anySvc.getAllUsers().subscribe((res:any) => this.users = res?.data || res || []);
      return;
    }

    // fallback mock if no API exists yet
    this.users = [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }];
  }

  get visibleRows(): PermRow[] {
    return this.rows.filter(r => r.moduleId === this.activeModuleId);
  }

  setModule(id: string) { this.activeModuleId = id; }

  toggleCell(rowId: string, col: PermissionCol) {
    this.rows = this.rows.map(r =>
      r.id !== rowId ? r : ({ ...r, flags: { ...r.flags, [col]: !r.flags[col] } })
    );
  }

  allColState(col: PermissionCol): boolean {
    const list = this.visibleRows;
    if (!list.length) return false;
    return list.every(r => !!r.flags[col]);
  }

  toggleAllCol(col: PermissionCol) {
    const next = !this.allColState(col);
    this.rows = this.rows.map(r => {
      if (r.moduleId !== this.activeModuleId) return r;
      return { ...r, flags: { ...r.flags, [col]: next } };
    });
  }

  reset() {
    this.rows = this.makeRows(this.modules);
  }

  save() {
    const payload = {
      userId: this.filter.userId,
      companyId: this.filter.companyId,
      effectiveDate: this.filter.effectiveDate,
      teamName: this.teamName,
      departmentName: this.departmentName,
      roleNames: this.selectedRoleNames,
      moduleId: this.activeModuleId,
      rows: this.visibleRows
    };
    console.log('SAVE PERMISSIONS', payload);
    alert('Saved (prototype). API connect panna ready.');
  }

  // ---------------- MENU FILTER CORE ----------------
  private isAllowedByRole(item: any, roleNames: string[]): boolean {
    const ar: string[] = item?.approvalRoles || [];
    if (!ar.length) return true;
    return roleNames.some(r => ar.includes(r));
  }

  private isAllowedByTeam(item: any, teamName: string): boolean {
    const teams: string[] = item?.teams || [];
    if (!teams.length) return true;
    if (!teamName) return false;
    return teams.includes(teamName);
  }

  private buildAllowedModules(menuArr: any[], teamName: string, roleNames: string[]): ModuleTab[] {
    const parents = (menuArr || []).filter(x => x.type === 'collapsible');

    return parents
      .filter(p => this.isAllowedByRole(p, roleNames) && this.isAllowedByTeam(p, teamName))
      .map(p => {
        const children = (p.children || [])
          .filter((c: any) => this.isAllowedByRole(c, roleNames) && this.isAllowedByTeam(c, teamName))
          .map((c: any) => ({ id: c.id, title: c.title, url: c.url }));

        if (!children.length) return null;
        return { id: p.id, title: p.title, items: children } as ModuleTab;
      })
      .filter(Boolean) as ModuleTab[];
  }

  // ✅ ES5 compatible (no Object.fromEntries)
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
        flags.V = true; // default view ON

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

  private pickDefaultModule(teamName: string, mods: ModuleTab[]): string {
    const ids = mods.map(m => m.id);

    if (teamName === 'Sales Team') return ids.includes('sales') ? 'sales' : (mods[0]?.id || '');
    if (teamName === 'Purchase Team') return ids.includes('purchase') ? 'purchase' : (ids.includes('inventory') ? 'inventory' : (mods[0]?.id || ''));
    if (teamName === 'Finance Team') return ids.includes('financial') ? 'financial' : (mods[0]?.id || '');

    return mods[0]?.id || '';
  }
}