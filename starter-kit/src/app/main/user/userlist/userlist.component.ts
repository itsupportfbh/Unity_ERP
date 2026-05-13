import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { DatatableComponent } from '@swimlane/ngx-datatable';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { UserService, UserView } from '../user.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-userlist',
  templateUrl: './userlist.component.html',
  styleUrls: ['./userlist.component.scss'],
  encapsulation:ViewEncapsulation.None
})
export class UserlistComponent implements OnInit {
  @ViewChild(DatatableComponent) table!: DatatableComponent;

  rows: UserView[] = [];
  filtered: UserView[] = [];

  loading = false;

  // PR list controls
  pageSize = 10;
  pageSizes = [5, 10, 25, 50, 100];
  searchText = '';

  public isDisplay = false;
  userId: number = 0;
  functionId = 'users';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private svc: UserService,
    private router: Router,
     private permissionService: PermissionService
  ) {this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);}

  ngOnInit(): void {
    this.loadPermission();
  }
  
    loadPermission(): void {
      if (!this.userId || this.userId <= 0) {
        this.permission = this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
  
        Swal.fire({
          icon: 'warning',
          title: 'Access Denied',
          text: 'User not found. Please login again.',
          confirmButtonColor: '#0e3a4c'
        });
        return;
      }
  
      this.isPageLoading = true;
  
      this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
        next: (res: FunctionPermission) => {
          this.permission = res || this.permissionService.getEmptyPermission(this.functionId);
          this.isPermissionLoaded = true;
          this.isPageLoading = false;
  
          if (this.canView()) {
            this.load();  
          } else {
            this.rows  = [];
            this.isDisplay = false;
          }
        },
        error: (err) => {
          console.error('Permission load error:', err);
          this.permission = this.permissionService.getEmptyPermission(this.functionId);
          this.isPermissionLoaded = true;
          this.isPageLoading = false;
  
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Unable to load permission.',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  
    canView(): boolean {
      return this.permissionService.hasView(this.permission);
    }
  
    canCreate(): boolean {
      return this.permissionService.hasCreate(this.permission);
    }
  
    canEdit(): boolean {
      return this.permissionService.hasEdit(this.permission);
    }
  
    canDelete(): boolean {
      return this.permissionService.hasDelete(this.permission);
    }

  load() {
    this.loading = true;
    this.svc.getAllView().subscribe({
      next: (res: any) => {
        // if your API returns wrapper {data:[]}
        const data = res?.data ?? res ?? [];
        this.rows = data;
        this.filtered = [...this.rows];
      },
      error: () => (this.loading = false),
      complete: () => (this.loading = false)
    });
  }

  onPageSizeChange() {
    if (this.table) this.table.offset = 0;
  }

  onSearchChange() {
    const s = (this.searchText || '').toLowerCase().trim();

    this.filtered = !s
      ? [...this.rows]
      : this.rows.filter(u =>
          (u.username || '').toLowerCase().includes(s) ||
          (u.email || '').toLowerCase().includes(s) ||
          (u.approvalLevelNames || []).join(',').toLowerCase().includes(s)
        );

    if (this.table) this.table.offset = 0;
  }

  add() {
    this.router.navigate(['/admin/users/access']);
  }

  edit(id: number) {
    this.router.navigate(['/admin/users/access', id]);
  }

  disable(row: UserView) {
    Swal.fire({
      title: 'Disable user?',
      text: row.username,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Disable'
    }).then(r => {
      if (r.isConfirmed) {
        this.svc.delete(row.id).subscribe(() => this.load());
      }
    });
  }
}
