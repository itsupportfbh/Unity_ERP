import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { BehaviorSubject, Observable, Subject } from 'rxjs';

import { AuthenticationService } from 'app/auth/service';
import { User } from 'app/auth/models';

@Injectable({
  providedIn: 'root'
})
export class CoreMenuService {
  currentUser: User;
  onItemCollapsed: Subject<any>;
  onItemCollapseToggled: Subject<any>;

  private _onMenuRegistered: BehaviorSubject<any>;
  private _onMenuUnregistered: BehaviorSubject<any>;
  private _onMenuChanged: BehaviorSubject<any>;
  private _currentMenuKey: string;
  private _registry: { [key: string]: any } = {};

  constructor(private _router: Router, private _authenticationService: AuthenticationService) {
    this._authenticationService.currentUser.subscribe(x => (this.currentUser = x));

    this.onItemCollapsed = new Subject();
    this.onItemCollapseToggled = new Subject();

    this._currentMenuKey = null;
    this._onMenuRegistered = new BehaviorSubject(null);
    this._onMenuUnregistered = new BehaviorSubject(null);
    this._onMenuChanged = new BehaviorSubject(null);
  }

  get onMenuRegistered(): Observable<any> {
    return this._onMenuRegistered.asObservable();
  }

  get onMenuUnregistered(): Observable<any> {
    return this._onMenuUnregistered.asObservable();
  }

  get onMenuChanged(): Observable<any> {
    return this._onMenuChanged.asObservable();
  }

  register(key, menu): void {
    if (this._registry[key]) {
      console.error(`Menu with the key '${key}' already exists. Either unregister it first or use a unique key.`);
      return;
    }

    this._registry[key] = menu;
    this._onMenuRegistered.next([key, menu]);
  }

  unregister(key): void {
    if (!this._registry[key]) {
      console.warn(`Menu with the key '${key}' doesn't exist in the registry.`);
    }

    delete this._registry[key];
    this._onMenuUnregistered.next(key);
  }

  getMenu(key): any {
    if (!this._registry[key]) {
      console.warn(`Menu with the key '${key}' doesn't exist in the registry.`);
      return;
    }

    return this._registry[key];
  }

  getCurrentMenu(): any {
    if (!this._currentMenuKey) {
      console.warn(`The current menu is not set.`);
      return;
    }

    return this.getMenu(this._currentMenuKey);
  }

  setCurrentMenu(key): void {
    if (!this._registry[key]) {
      console.warn(`Menu with the key '${key}' doesn't exist in the registry.`);
      return;
    }

    this._currentMenuKey = key;
    this._onMenuChanged.next(key);
  }

  // ✅ New method: view permission true iruntha mattum menu show
  filterMenuByViewPermission(menu: any[], permissions: any[]): any[] {
    const viewMap = new Map<string, boolean>();

    permissions.forEach(p => {
      const functionId = p.FunctionId || p.functionId;
      const view = p.Permissions?.View ?? p.permissions?.view ?? p.view ?? p.View ?? false;

      if (functionId) {
        viewMap.set(functionId, !!view);
      }
    });

    return menu
      .map(item => this.filterMenuItem(item, viewMap))
      .filter(item => !!item);
  }

  private filterMenuItem(item: any, viewMap: Map<string, boolean>): any | null {
    if (item.hidden === true) {
      return null;
    }

    if (item.children && item.children.length > 0) {
      const children = item.children
        .map(child => this.filterMenuItem(child, viewMap))
        .filter(child => !!child);

      if (children.length === 0) {
        return null;
      }

      return {
        ...item,
        children
      };
    }

    return viewMap.get(item.id) === true ? item : null;
  }

  // ✅ Existing menu replace panna easy method
  setMenuByPermission(key: string, menu: any[], permissions: any[]): void {
    const filteredMenu = this.filterMenuByViewPermission(menu, permissions);

    if (this._registry[key]) {
      this.unregister(key);
    }

    this.register(key, filteredMenu);
    this.setCurrentMenu(key);
  }
}