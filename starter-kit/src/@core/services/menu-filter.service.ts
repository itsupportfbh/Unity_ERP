import { Injectable } from '@angular/core';
import { menu } from 'app/menu/menu';

@Injectable({ providedIn: 'root' })
export class MenuFilterService {

  getFilteredMenu() {
    const roles: string[] = JSON.parse(localStorage.getItem('roles') || '[]');

    return menu
      .filter(m => this.hasAccess(m, roles))
      .map(m => ({
        ...m,
        children: m.children?.filter(c => this.hasAccess(c, roles))
      }));
  }

  private hasAccess(menuItem: any, roles: string[]): boolean {
    if (!menuItem.roles || menuItem.roles.length === 0) return true;
    return menuItem.roles.some((r: string) => roles.includes(r));
  }
}
