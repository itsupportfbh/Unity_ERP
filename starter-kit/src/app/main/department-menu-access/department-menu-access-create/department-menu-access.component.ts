import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { menu } from '../../../menu/menu';
import {
  DepartmentDto,
  DepartmentMenuAccessService,
  SaveDepartmentMenuAccessRequest
} from '../department-menu-access.service';

@Component({
  selector: 'app-department-menu-access',
  templateUrl: './department-menu-access.component.html',
  styleUrls: ['./department-menu-access.component.scss']
})
export class DepartmentMenuAccessComponent implements OnInit {
  departments: DepartmentDto[] = [];
  selectedDepartmentId: number | null = null;

  allMenus: any[] = [];
  checkedIds = new Set<string>();

  loading = false;
  saving = false;
  isEdit = false;

  constructor(
    private service: DepartmentMenuAccessService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.allMenus = (menu || []).filter((x: any) => x.type !== 'section');

    this.loadDepartments();

    const departmentId = Number(this.route.snapshot.paramMap.get('departmentId'));
    if (departmentId) {
      this.isEdit = true;
      this.selectedDepartmentId = departmentId;
      this.loadDepartmentAccess(departmentId);
    }
  }

  loadDepartments(): void {
    this.service.getDepartments().subscribe({
      next: (res) => {
        this.departments = res?.data || [];
      },
      error: (err) => {
        console.error('Departments API Error:', err);
        this.departments = [];
      }
    });
  }

  loadDepartmentAccess(departmentId: number): void {
    this.loading = true;
    this.service.getByDepartmentId(departmentId).subscribe({
      next: (res) => {
        this.checkedIds.clear();

        // top-level modules மட்டும் mark பண்ணுறோம்
        const topModuleIds = this.getTopModules().map(x => x.id);
        (res || []).forEach(x => {
          if (topModuleIds.includes(x)) {
            this.checkedIds.add(x);
          }
        });

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onDepartmentChange(): void {
    if (!this.selectedDepartmentId) {
      this.checkedIds.clear();
      return;
    }

    if (this.isEdit) {
      this.loadDepartmentAccess(this.selectedDepartmentId);
      return;
    }

    this.checkedIds.clear();
  }

  getTopModules(): any[] {
    return (this.allMenus || []).filter((x: any) => x.id !== 'home');
  }

  isChecked(id: string): boolean {
    return this.checkedIds.has(id);
  }

  toggleTopModule(module: any, checked: boolean): void {
    if (checked) {
      this.checkedIds.add(module.id);
    } else {
      this.checkedIds.delete(module.id);
    }
  }

  toggleModuleCard(module: any): void {
    if (this.isChecked(module.id)) {
      this.checkedIds.delete(module.id);
    } else {
      this.checkedIds.add(module.id);
    }
  }

  getSelectedCount(): number {
    return this.checkedIds.size;
  }

  save(): void {
    if (!this.selectedDepartmentId) {
      Swal.fire('Warning', 'Please select a department', 'warning');
      return;
    }

    const payload: SaveDepartmentMenuAccessRequest = {
      departmentId: this.selectedDepartmentId,
      menuIds: ['home', ...Array.from(this.checkedIds)],
      updatedBy: Number(localStorage.getItem('id') || 0)
    };

    this.saving = true;

    this.service.saveDepartmentMenuAccess(payload).subscribe({
      next: (res) => {
        this.saving = false;

        if (res?.success || res?.isSuccess) {
          Swal.fire('Success', res.message || 'Saved successfully', 'success').then(() => {
            this.resetForm();
            this.router.navigate(['/department-menu-access']);
          });
        } else {
          Swal.fire('Error', res?.message || 'Save failed', 'error');
        }
      },
      error: () => {
        this.saving = false;
        Swal.fire('Error', 'Save failed', 'error');
      }
    });
  }

  resetForm(): void {
    this.selectedDepartmentId = null;
    this.checkedIds.clear();
  }

  back(): void {
    this.router.navigate(['/department-menu-access']);
  }

  getModuleIcon(moduleId: string): string {
  switch (moduleId) {
    case 'master':
      return 'fas fa-cog';
    case 'sales':
      return 'fas fa-chart-line';
    case 'purchase':
      return 'fas fa-shopping-cart';
    case 'inventory':
      return 'fas fa-boxes';
    case 'financial':
      return 'fas fa-dollar-sign';
    case 'recipe':
      return 'fas fa-utensils';
    default:
      return 'fas fa-layer-group';
  }
}
}