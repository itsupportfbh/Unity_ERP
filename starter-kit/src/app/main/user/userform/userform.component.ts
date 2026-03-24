import { Component, OnInit, ViewEncapsulation, Output, EventEmitter } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../user.service';
import Swal from 'sweetalert2';
import { LocationService } from 'app/main/master/location/location.service';
import { UserContextEvent } from '../user-access-wizard/user-access-wizard.component';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&()[\]{}#^+=\-_.:,;])[A-Za-z\d@$!%*?&()[\]{}#^+=\-_.:,;]{8,}$/;

function passwordStrong(control: AbstractControl): ValidationErrors | null {
  const val = (control.value || '').toString();
  if (!val) return null;
  return PASSWORD_REGEX.test(val) ? null : { strongPassword: true };
}

@Component({
  selector: 'app-userform',
  templateUrl: './userform.component.html',
  styleUrls: ['./userform.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class UserformComponent implements OnInit {
  @Output() nextToPermissions = new EventEmitter<UserContextEvent>();
  @Output() userContextChanged = new EventEmitter<UserContextEvent>();

  form!: FormGroup;
  id = 0;
  isEdit = false;
  canEditPassword = false;

  roles: any[] = [];
  departments: any[] = [];
  locations: any[] = [];

  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private svc: UserService,
    private locationService: LocationService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      departmentId: [null, Validators.required],
      locationId: [null, Validators.required],
      approvalLevelIds: [[]]
    });

    this.loadMasters();
    this.loadRouteData();

    this.form.get('departmentId')?.valueChanges.subscribe(() => this.emitContext());
    this.form.get('approvalLevelIds')?.valueChanges.subscribe(() => this.emitContext());
  }

  private toNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private toNumberArray(values: any[]): number[] {
    return (values || [])
      .map(x => Number(x))
      .filter(x => Number.isFinite(x) && x > 0);
  }

  private loadMasters(): void {
    this.getAllLocations();
    this.getDepartment();

    this.svc.getApprovalLevels().subscribe({
      next: (res: any) => {
        this.roles = res?.data || res || [];
        this.emitContext();
      },
      error: () => {
        this.roles = [];
      }
    });
  }

  private loadRouteData(): void {
    const childId = Number(this.route.snapshot.paramMap.get('id')) || 0;
    const parentId = Number(this.route.parent?.snapshot.paramMap.get('id')) || 0;

    this.id = childId || parentId || 0;
    this.isEdit = this.id > 0;
    this.canEditPassword = !this.isEdit;

    this.form.reset({
      username: '',
      email: '',
      password: '',
      departmentId: null,
      locationId: null,
      approvalLevelIds: []
    });

    const pwd = this.form.get('password');

    if (this.isEdit) {
      pwd?.disable({ emitEvent: false });
      pwd?.clearValidators();
      pwd?.setValue('');
    } else {
      pwd?.enable({ emitEvent: false });
      pwd?.setValidators([Validators.required, passwordStrong]);
    }

    pwd?.updateValueAndValidity({ emitEvent: false });

    if (this.isEdit) {
      this.loadEditData();
    } else {
      this.emitContext();
    }
  }

  private loadEditData(): void {
    this.svc.getViewById(this.id).subscribe({
      next: (res: any) => {
        const u = res?.data || res || {};

        this.form.patchValue({
          username: u.username ?? '',
          email: u.email ?? '',
          departmentId: this.toNumber(u.departmentId),
          locationId: this.toNumber(u.locationId),
          approvalLevelIds: this.toNumberArray(u.approvalLevelIds || [])
        });

        this.emitContext();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text:
            err?.error?.message ||
            err?.error?.title ||
            'Unable to load user details for edit.'
        });
      }
    });
  }

  private getTeamFromDepartmentName(deptName: string): string {
    const n = (deptName || '').toLowerCase();

    if (n.includes('sales')) return 'Sales Team';
    if (n.includes('purchase')) return 'Purchase Team';
    if (n.includes('finance')) return 'Finance Team';
    if (n.includes('admin')) return 'Admin';

    return deptName || '';
  }

  private getDepartmentNameById(id: number | null): string {
    if (!id) return '';
    const d = (this.departments || []).find(x => +x.id === +id);
    return d?.name || d?.departmentName || '';
  }

  private selectedRoleNamesFromIds(ids: number[]): string[] {
    const set = new Set((ids || []).map(x => +x));
    return (this.roles || [])
      .filter(r => set.has(+r.id))
      .map(r => (r.name || '').toString().trim())
      .filter(x => !!x);
  }

  emitContext(): void {
    if (!this.form) return;

    const deptId = this.toNumber(this.form.get('departmentId')?.value);
    const deptName = this.getDepartmentNameById(deptId);
    const teamName = this.getTeamFromDepartmentName(deptName);

    const roleIds = this.toNumberArray(this.form.get('approvalLevelIds')?.value || []);
    const roleNames = this.selectedRoleNamesFromIds(roleIds);

    const payload: UserContextEvent = {
      departmentId: deptId,
      departmentName: deptName,
      approvalLevelIds: roleIds,
      selectedRoleNames: roleNames,
      teamName
    };

    this.userContextChanged.emit(payload);
  }

  next(): void {
    this.form.markAllAsTouched();

    const passwordInvalid =
      (!this.isEdit && this.form.get('password')?.invalid) ||
      (this.isEdit && this.canEditPassword && this.form.get('password')?.invalid);

    if (
      this.form.get('username')?.invalid ||
      this.form.get('email')?.invalid ||
      this.form.get('departmentId')?.invalid ||
      this.form.get('locationId')?.invalid ||
      passwordInvalid
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Incomplete Details',
        text: 'Please complete required fields before continuing.'
      });
      return;
    }

    const deptId = this.toNumber(this.form.get('departmentId')?.value);

    if (!deptId) {
      Swal.fire({
        icon: 'warning',
        title: 'Select Department',
        text: 'Please select Department before continuing.'
      });
      return;
    }

    const deptName = this.getDepartmentNameById(deptId);
    const teamName = this.getTeamFromDepartmentName(deptName);
    const roleIds = this.toNumberArray(this.form.get('approvalLevelIds')?.value || []);
    const roleNames = this.selectedRoleNamesFromIds(roleIds);

    this.nextToPermissions.emit({
      departmentId: deptId,
      departmentName: deptName,
      approvalLevelIds: roleIds,
      selectedRoleNames: roleNames,
      teamName
    });
  }

  togglePasswordEdit(): void {
    this.canEditPassword = !this.canEditPassword;
    const pwd = this.form.get('password');

    if (this.canEditPassword) {
      pwd?.enable({ emitEvent: false });
      pwd?.setValidators([Validators.required, passwordStrong]);
    } else {
      pwd?.disable({ emitEvent: false });
      pwd?.clearValidators();
      pwd?.setValue('');
    }

    pwd?.updateValueAndValidity({ emitEvent: false });
  }

  buildUserPayload(): any {
    const raw = this.form.getRawValue();

    const payload: any = {
      username: (raw.username || '').toString().trim(),
      email: (raw.email || '').toString().trim(),
      departmentId: this.toNumber(raw.departmentId),
      locationId: this.toNumber(raw.locationId),
      approvalLevelIds: this.toNumberArray(raw.approvalLevelIds || [])
    };

    if (!this.isEdit || this.canEditPassword) {
      payload.password = (raw.password || '').toString();
    }

    return payload;
  }

  cancel(): void {
    if (this.form.dirty) {
      Swal.fire({
        title: 'Discard changes?',
        text: 'Your changes will be lost.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, go back',
        cancelButtonText: 'Stay'
      }).then(r => {
        if (r.isConfirmed) {
          this.router.navigate(['/admin/users']);
        }
      });
      return;
    }

    this.router.navigate(['/admin/users']);
  }

  getDepartment(): void {
    this.svc.getDepartments().subscribe({
      next: (res: any) => {
        this.departments = res?.data || res || [];
        this.emitContext();
      },
      error: () => {
        this.departments = [];
      }
    });
  }

  getAllLocations(): void {
    this.locationService.getLocationDetails().subscribe({
      next: (response: any) => {
        this.locations = response?.data ?? response ?? [];
        this.emitContext();
      },
      error: () => {
        this.locations = [];
      }
    });
  }
}