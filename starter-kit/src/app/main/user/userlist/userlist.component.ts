import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { DatatableComponent } from '@swimlane/ngx-datatable';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { UserService, UserView } from '../user.service';

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

  constructor(
    private svc: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
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
    this.router.navigate(['/admin/users/new']);
  }

  edit(id: number) {
    this.router.navigate(['/admin/users', id, 'edit']);
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
