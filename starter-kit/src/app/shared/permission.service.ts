import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface FunctionPermission {
  functionId: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  submit: boolean;
  approve: boolean;
  reject: boolean;
  cancel: boolean;
  print: boolean;
  export: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private baseUrl = environment.apiUrl; // change if your env key is different

  constructor(private http: HttpClient) {}

  getFunctionPermission(userId: number, functionId: string): Observable<FunctionPermission> {
    return this.http
      .get<any>(`${this.baseUrl}/OrganizationRole/permission?userId=${userId}&functionId=${functionId}`)
      .pipe(
        map((res: any) => {
          const p = res?.data || {};

          return {
            functionId: p.functionId || p.FunctionId || functionId,
            view: !!(p.view ?? p.View),
            create: !!(p.create ?? p.Create),
            edit: !!(p.edit ?? p.Edit),
            delete: !!(p.delete ?? p.Delete),
            submit: !!(p.submit ?? p.Submit),
            approve: !!(p.approve ?? p.Approve),
            reject: !!(p.reject ?? p.Reject),
            cancel: !!(p.cancel ?? p.Cancel),
            print: !!(p.print ?? p.Print),
            export: !!(p.export ?? p.Export)
          } as FunctionPermission;
        })
      );
  }

  getEmptyPermission(functionId: string = ''): FunctionPermission {
    return {
      functionId,
      view: false,
      create: false,
      edit: false,
      delete: false,
      submit: false,
      approve: false,
      reject: false,
      cancel: false,
      print: false,
      export: false
    };
  }

  hasView(permission: FunctionPermission | null | undefined): boolean {
    return !!permission?.view;
  }

  hasCreate(permission: FunctionPermission | null | undefined): boolean {
    return !!permission?.create;
  }

  hasEdit(permission: FunctionPermission | null | undefined): boolean {
    return !!permission?.edit;
  }

  hasDelete(permission: FunctionPermission | null | undefined): boolean {
    return !!permission?.delete;
  }
}