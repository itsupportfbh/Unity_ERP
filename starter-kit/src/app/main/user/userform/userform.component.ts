import { Component, OnInit, ViewEncapsulation } from '@angular/core';
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
  encapsulation:ViewEncapsulation.None
})
export class UserformComponent implements OnInit {
  form!: FormGroup;
  id = 0;
  isEdit = false;
  canEditPassword = false;

  roles: any[] = [];

  isSaving = false;
departments: any[] = [];
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private svc: UserService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      departmentId: [null, Validators.required], 
      approvalLevelIds: [[]]
    });

    this.svc.getApprovalLevels().subscribe((res: any) => {
      this.roles = res?.data || [];
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
           approvalLevelIds: u.approvalLevelIds || []
          });
        });
      }
    });
    this.getDepartment();
  }

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

  // 1) direct message
  if (typeof e?.message === 'string' && e.message.trim()) return e.message;

  // 2) ASP.NET validation: { errors: { Password: ["..."], Email: ["..."] } }
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

  // 3) string body
  if (typeof e === 'string' && e.trim()) return e;

  // 4) fallback
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
    approvalLevelIds: this.form.value.approvalLevelIds || []
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
    // Optional confirm if form dirty
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
});
  }
}
