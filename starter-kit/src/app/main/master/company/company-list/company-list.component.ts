import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyService, CompanyRow } from '../company-service';
import { DatatableComponent } from '@swimlane/ngx-datatable';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-company-list',
  templateUrl: './company-list.component.html',
  styleUrls: ['./company-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CompanyListComponent implements OnInit {
  @ViewChild(DatatableComponent) table!: DatatableComponent;

  loading = false;
  searchText = '';
  pageSize = 10;
  pageSizes = [5, 10, 25, 50, 100];

  rows: CompanyRow[] = [];
  filteredRows: CompanyRow[] = [];

  totalCount = 0;
  activeCount = 0;
  inactiveCount = 0;

  constructor(
    private router: Router,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.loading = true;

    const approvalRoles: string[] = JSON.parse(localStorage.getItem('approvalRoles') || '[]');
    const isSuperAdmin = approvalRoles.some(x =>
      (x || '').trim().toLowerCase() === 'super admin'
    );

    const approvalLevelName = isSuperAdmin ? 'Super Admin' : '';
    const orgGuid = localStorage.getItem('orgGuid') || '';

    this.companyService.getCompanyList(approvalLevelName, orgGuid).subscribe({
      next: (res: CompanyRow[]) => {
        this.rows = Array.isArray(res) ? res : [];
        this.filteredRows = [...this.rows];
        this.updateSummaryCounts();
        this.loading = false;

        if (this.table) {
          this.table.offset = 0;
        }
      },
      error: (err) => {
        console.error('Error loading companies', err);
        this.rows = [];
        this.filteredRows = [];
        this.updateSummaryCounts();
        this.loading = false;
      }
    });
  }

  updateSummaryCounts(): void {
    this.totalCount = this.rows.length;
    this.activeCount = this.rows.filter(x => !!x.isActive).length;
    this.inactiveCount = this.rows.filter(x => !x.isActive).length;
  }

  onSearchChange(): void {
    const term = (this.searchText || '').trim().toLowerCase();

    if (!term) {
      this.filteredRows = [...this.rows];
      if (this.table) this.table.offset = 0;
      return;
    }

    this.filteredRows = this.rows.filter(x =>
      (x.companyCode || '').toLowerCase().includes(term) ||
      (x.companyName || '').toLowerCase().includes(term) ||
      (x.orgGuid || '').toLowerCase().includes(term) ||
      (x.baseCurrency || '').toLowerCase().includes(term) ||
      (x.country || '').toLowerCase().includes(term) ||
      (x.adminUsername || '').toLowerCase().includes(term) ||
      (x.adminEmail || '').toLowerCase().includes(term) ||
      (x.createdBy || '').toLowerCase().includes(term)
    );

    if (this.table) this.table.offset = 0;
  }

  onPageSizeChange(): void {
    if (this.table) {
      this.table.offset = 0;
    }
  }

  addCompany(): void {
    this.router.navigate(['/master/company']);
  }

  editCompany(row: CompanyRow): void {
    if (!row?.id) return;
    this.router.navigate(['/master/company', row.id, 'edit']);
  }

  openCompany(row: CompanyRow): void {
    localStorage.setItem('selectedCompanyId', String(row.id));
    localStorage.setItem('selectedOrgGuid', row.orgGuid || '');
    localStorage.setItem('selectedCompanyName', row.companyName || '');
    this.router.navigate(['/home']);
  }

 avatarThemes = [
  {
    background: 'linear-gradient(135deg, #eaf4f7 0%, #d8ebf1 100%)',
    color: '#2E5F73',
    border: '1px solid rgba(46, 95, 115, 0.14)'
  },
  {
    background: 'linear-gradient(135deg, #fff4e6 0%, #ffe3bf 100%)',
    color: '#b26a00',
    border: '1px solid rgba(178, 106, 0, 0.16)'
  },
  {
    background: 'linear-gradient(135deg, #f3e8ff 0%, #e4d4ff 100%)',
    color: '#7b3fb6',
    border: '1px solid rgba(123, 63, 182, 0.16)'
  },
  {
    background: 'linear-gradient(135deg, #e8fff1 0%, #cff5de 100%)',
    color: '#1f8a5b',
    border: '1px solid rgba(31, 138, 91, 0.16)'
  },
  {
    background: 'linear-gradient(135deg, #ffecef 0%, #ffd6dc 100%)',
    color: '#c24b64',
    border: '1px solid rgba(194, 75, 100, 0.16)'
  },
  {
    background: 'linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%)',
    color: '#4a67c2',
    border: '1px solid rgba(74, 103, 194, 0.16)'
  },
  {
    background: 'linear-gradient(135deg, #e9fbff 0%, #d2f4fb 100%)',
    color: '#1d7f91',
    border: '1px solid rgba(29, 127, 145, 0.16)'
  }
];

getCompanyAvatarStyle(index: number) {
  const theme = this.avatarThemes[index % this.avatarThemes.length];
  return {
    background: theme.background,
    color: theme.color,
    border: theme.border
  };
}

getCompanyAvatar(row: any): string {
  const name = row?.companyName?.trim();
  if (!name) return '?';

  const words = name.split(' ').filter((x: string) => x);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

  deleteCompany(row: CompanyRow): void {
    if (!row?.id) return;

    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete company "${row.companyName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.companyService.deleteCompany(row.id).subscribe({
        next: (res: any) => {
          Swal.fire({
            icon: 'success',
            title: 'Deleted',
            text: res?.message || 'Company deleted successfully',
            confirmButtonColor: '#2E5F73'
          });

          this.loadCompanies();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || 'Company delete failed',
            confirmButtonColor: '#d33'
          });
        }
      });
    });
  }
  
}