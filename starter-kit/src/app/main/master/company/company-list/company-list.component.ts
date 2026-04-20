import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import {
  CompanyItemDto,
  CompanyService,
  OrganizationCompanyGroupDto
} from '../company-service';

interface OrganizationCompanyGroupVm extends OrganizationCompanyGroupDto {
  expanded: boolean;
}

@Component({
  selector: 'app-company-list',
  templateUrl: './company-list.component.html',
  styleUrls: ['./company-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CompanyListComponent implements OnInit {
  loading = false;
  searchText = '';

  rows: OrganizationCompanyGroupVm[] = [];
  filteredRows: OrganizationCompanyGroupVm[] = [];

  totalOrganizations = 0;
  totalCompanies = 0;
  activeCompanies = 0;
  inactiveCompanies = 0;

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

  constructor(
    private router: Router,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    this.loadOrganizationCompanies();
  }

  loadOrganizationCompanies(): void {
    this.loading = true;

    const approvalRoles: string[] = JSON.parse(localStorage.getItem('approvalRoles') || '[]');
    const isSuperAdmin = approvalRoles.some(x =>
      (x || '').trim().toLowerCase() === 'super admin'
    );

    const approvalLevelName = isSuperAdmin ? 'Super Admin' : '';
    const orgGuid = localStorage.getItem('orgGuid') || '';

    this.companyService.getOrganizationCompanyList(approvalLevelName, orgGuid).subscribe({
      next: (res) => {
        this.rows = (Array.isArray(res) ? res : []).map((x, index) => ({
          ...x,
          expanded: index === 0
        }));

        this.filteredRows = [...this.rows];
        this.updateSummaryCounts();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading organization companies', err);
        this.rows = [];
        this.filteredRows = [];
        this.updateSummaryCounts();
        this.loading = false;
      }
    });
  }

  updateSummaryCounts(): void {
    this.totalOrganizations = this.rows.length;
    this.totalCompanies = this.rows.reduce((sum, x) => sum + (x.companyCount || 0), 0);
    this.activeCompanies = this.rows.reduce(
      (sum, org) => sum + (org.companies || []).filter(c => !!c.isActive).length,
      0
    );
    this.inactiveCompanies = this.rows.reduce(
      (sum, org) => sum + (org.companies || []).filter(c => !c.isActive).length,
      0
    );
  }

  onSearchChange(): void {
    const term = (this.searchText || '').trim().toLowerCase();

    if (!term) {
      this.filteredRows = [...this.rows];
      return;
    }

    this.filteredRows = this.rows
      .map(org => {
        const orgMatch =
          (org.orgCode || '').toLowerCase().includes(term) ||
          (org.orgName || '').toLowerCase().includes(term) ||
          (org.orgGuid || '').toLowerCase().includes(term);

        const companyMatches = (org.companies || []).filter(company =>
          (company.companyCode || '').toLowerCase().includes(term) ||
          (company.companyName || '').toLowerCase().includes(term) ||
          (company.legalName || '').toLowerCase().includes(term) ||
          (company.baseCurrency || '').toLowerCase().includes(term) ||
          (company.country || '').toLowerCase().includes(term) ||
          (company.adminUsername || '').toLowerCase().includes(term) ||
          (company.adminEmail || '').toLowerCase().includes(term) ||
          (company.createdByName || '').toLowerCase().includes(term) ||
          (company.updatedByName || '').toLowerCase().includes(term)
        );

        if (orgMatch) {
          return {
            ...org,
            expanded: true,
            companies: [...org.companies],
            companyCount: org.companies.length
          };
        }

        if (companyMatches.length > 0) {
          return {
            ...org,
            expanded: true,
            companies: companyMatches,
            companyCount: companyMatches.length
          };
        }

        return null;
      })
      .filter((x): x is OrganizationCompanyGroupVm => x !== null);
  }

  toggleExpand(row: OrganizationCompanyGroupVm): void {
    row.expanded = !row.expanded;
  }

  addCompany(): void {
    this.router.navigate(['/master/company']);
  }

  editCompany(row: CompanyItemDto): void {
    if (!row?.id) return;
    this.router.navigate(['/master/company', row.id, 'edit']);
  }

  openCompany(row: CompanyItemDto): void {
    localStorage.setItem('selectedCompanyId', String(row.id));
    localStorage.setItem('selectedOrgGuid', row.orgGuid || '');
    localStorage.setItem('selectedCompanyName', row.companyName || '');
    this.router.navigate(['/home']);
  }

  getOrganizationAvatarStyle(index: number) {
    const theme = this.avatarThemes[index % this.avatarThemes.length];
    return {
      background: theme.background,
      color: theme.color,
      border: theme.border
    };
  }

  getOrganizationAvatar(row: OrganizationCompanyGroupVm): string {
    const name = row?.orgName?.trim();
    if (!name) return '?';

    const words = name.split(' ').filter(x => x);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }

    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }

  deleteCompany(row: CompanyItemDto): void {
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

          this.loadOrganizationCompanies();
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

  trackByOrganization(index: number, item: OrganizationCompanyGroupVm): number {
    return item.organizationId;
  }

  trackByCompany(index: number, item: CompanyItemDto): number {
    return item.id;
  }
}