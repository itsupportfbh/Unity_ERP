import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { DepartmentMenuAccessListItem, DepartmentMenuAccessService } from '../department-menu-access.service';

@Component({
  selector: 'app-department-menu-access-list',
  templateUrl: './department-menu-access-list.component.html',
  styleUrls: ['./department-menu-access-list.component.scss']
})
export class DepartmentMenuAccessListComponent implements OnInit {
  loading = false;
  rows: DepartmentMenuAccessListItem[] = [];

  constructor(
    private router: Router,
    private service: DepartmentMenuAccessService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.service.getAllDepartmentMenuAccess().subscribe({
      next: (res) => {
        this.rows = res || [];
        this.loading = false;
      },
      error: () => {
        this.rows = [];
        this.loading = false;
      }
    });
  }

  create(): void {
    this.router.navigate(['/department-menu-access/create']);
  }

  edit(row: DepartmentMenuAccessListItem): void {
    this.router.navigate(['/department-menu-access/edit', row.departmentId]);
  }

  remove(row: DepartmentMenuAccessListItem): void {
    Swal.fire({
      icon: 'warning',
      title: 'Delete Access?',
      text: `Do you want to delete access for ${row.departmentName}?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    }).then((r) => {
      if (!r.isConfirmed) return;

      this.service.deleteDepartmentMenuAccess(row.departmentId).subscribe({
        next: (res) => {
          if (res?.success) {
            Swal.fire('Deleted', res.message || 'Deleted successfully', 'success');
            this.loadData();
          } else {
            Swal.fire('Error', res?.message || 'Delete failed', 'error');
          }
        },
        error: () => {
          Swal.fire('Error', 'Delete failed', 'error');
        }
      });
    });
  }
}