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

/* ========= PASSWORD VALIDATOR ========= */
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

  roles: any[] = [];          // approval levels [{id,name}]
  departments: any[] = [];    // [{id,name}]
  locations: any[] = [];

  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private svc: UserService,
    private _locationserice: LocationService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      departmentId: [null, Validators.required],
      locationId: [ null, Validators.required],
      approvalLevelIds: [[]]
    });

    this.getAllLocations();
    this.getDepartment();

    this.svc.getApprovalLevels().subscribe((res: any) => {
      this.roles = res?.data || [];
      this.emitContext();
    });

    this.route.paramMap.subscribe(pm => {
      this.id = Number(pm.get('id')) || 0;
      this.isEdit = !!this.id;
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
      } else {
        pwd?.enable({ emitEvent: false });
        pwd?.setValidators([Validators.required, passwordStrong]);
      }
      pwd?.updateValueAndValidity();

      if (this.isEdit) {
        this.svc.getViewById(this.id).subscribe(u => {
          this.form.patchValue({
            username: u.username,
            email: u.email,
            departmentId: u.departmentId ?? null,
            locationId: u.locationId ?? null,
            approvalLevelIds: u.approvalLevelIds || []
          });
          this.emitContext();
        });
      }
    });

    // auto emit when department/roles change
    this.form.get('departmentId')?.valueChanges.subscribe(() => this.emitContext());
    this.form.get('approvalLevelIds')?.valueChanges.subscribe(() => this.emitContext());
  }

  /* ========= DepartmentName -> TeamName mapping =========
     IMPORTANT: ungaloda Department master la name eppadi iruko adhu base panna mapping. */
  private getTeamFromDepartmentName(deptName: string): string {
    const n = (deptName || '').toLowerCase();

    if (n.includes('sales')) return 'Sales Team';
    if (n.includes('purchase')) return 'Purchase Team';
    if (n.includes('finance')) return 'Finance Team';
    if (n.includes('admin')) return 'Admin';

    // if already "Sales Team" etc.
    return deptName || '';
  }

  private getDepartmentNameById(id: number | null): string {
    if (!id) return '';
    const d = (this.departments || []).find(x => +x.id === +id);
    return d?.name || '';
  }

  private selectedRoleNamesFromIds(ids: number[]): string[] {
    const set = new Set((ids || []).map(x => +x));
    return (this.roles || [])
      .filter(r => set.has(+r.id))
      .map(r => (r.name || '').toString().trim())
      .filter(x => !!x);
  }

  emitContext() {
    const deptId = this.form.get('departmentId')?.value ?? null;
    const deptName = this.getDepartmentNameById(deptId);
    const teamName = this.getTeamFromDepartmentName(deptName);

    const roleIds: number[] = (this.form.get('approvalLevelIds')?.value || []) as number[];
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

  next() {
    const deptId = this.form.get('departmentId')?.value ?? null;
    const roleIds: number[] = (this.form.get('approvalLevelIds')?.value || []) as number[];

    if (!deptId || roleIds.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Select Department & Roles',
        text: 'Please select Department (Team) and Roles (Approval Levels) to configure permissions.'
      });
      return;
    }

    const deptName = this.getDepartmentNameById(deptId);
    const teamName = this.getTeamFromDepartmentName(deptName);
    const roleNames = this.selectedRoleNamesFromIds(roleIds);

    this.nextToPermissions.emit({
      departmentId: deptId,
      departmentName: deptName,
      approvalLevelIds: roleIds,
      selectedRoleNames: roleNames,
      teamName
    });
  }

  // ---------------- existing methods (same as your code) ----------------
  togglePasswordEdit() {
    this.canEditPassword = !this.canEditPassword;
    const pwd = this.form.get('password');

    if (this.canEditPassword) {
      pwd?.enable({ emitEvent: false });
      pwd?.setValidators([passwordStrong]);
    } else {
      pwd?.disable({ emitEvent: false });
      pwd?.clearValidators();
      pwd?.setValue('');
    }
    pwd?.updateValueAndValidity();
  }

  private getApiErrorMessage(err: any): string {
    const e = err?.error;
    if (typeof e?.message === 'string' && e.message.trim()) return e.message;

    const errors = e?.errors;
    if (errors && typeof errors === 'object') {
      const msgs: string[] = [];
      Object.keys(errors).forEach(k => {
        const arr = errors[k];
        if (Array.isArray(arr)) {
          arr.forEach(m => {
            if (typeof m === 'string' && m.trim()) msgs.push(m);
          });
        }
      });
      if (msgs.length) return msgs.join('\n');
    }

    if (typeof e === 'string' && e.trim()) return e;
    if (typeof err?.message === 'string' && err.message.trim()) return err.message;

    return 'Something went wrong.';
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const payload: any = {
      username: this.form.value.username,
      email: this.form.value.email,
      departmentId: this.form.value.departmentId,
      approvalLevelIds: this.form.value.approvalLevelIds || [],
      locationId: this.form.value.locationId
    };

    if (!this.isEdit || this.canEditPassword) {
      payload.password = this.form.value.password;
    }

    this.isSaving = true;

    Swal.fire({
      title: this.isEdit ? 'Updating…' : 'Creating…',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const req = this.isEdit
      ? this.svc.update(this.id, payload)
      : this.svc.insert(payload);

    req.subscribe({
      next: () => {
        Swal.fire({
          title: 'Success',
          text: this.isEdit ? 'User updated successfully.' : 'User created successfully.',
          icon: 'success',
          timer: 1200,
          showConfirmButton: false
        }).then(() => {
          this.router.navigate(['/admin/users']);
        });
      },
      error: (err) => {
        this.isSaving = false;
        Swal.fire({
          title: 'Failed',
          text: this.getApiErrorMessage(err),
          icon: 'error'
        });
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  cancel() {
    if (this.form.dirty) {
      Swal.fire({
        title: 'Discard changes?',
        text: 'Your changes will be lost.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, go back',
        cancelButtonText: 'Stay'
      }).then(r => {
        if (r.isConfirmed) this.router.navigate(['/admin/users']);
      });
      return;
    }
    this.router.navigate(['/admin/users']);
  }

  getDepartment(){
    this.svc.getDepartments().subscribe((res: any) => {
      this.departments = res?.data || [];
      this.emitContext();
    });
  }

  getAllLocations(): void {
    this._locationserice.getLocationDetails().subscribe((response: any) => {
      this.locations = response?.data ?? [];
    });
  }
}