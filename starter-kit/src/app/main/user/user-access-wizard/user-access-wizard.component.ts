import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { UserformComponent } from '../userform/userform.component';
import { RolesPermissionsComponent } from '../roles-permissions/roles-permissions.component';
import { UserService } from '../user.service';

export interface UserContextEvent {
  departmentId: number | null;
  departmentName: string;
  approvalLevelIds: number[];
  selectedRoleNames: string[];
  teamName: string;
}

@Component({
  selector: 'app-user-access-wizard',
  templateUrl: './user-access-wizard.component.html',
  styleUrls: ['./user-access-wizard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class UserAccessWizardComponent {
  @ViewChild(UserformComponent) userFormComp!: UserformComponent;
  @ViewChild(RolesPermissionsComponent) rolesComp!: RolesPermissionsComponent;

  activeTab: 'users' | 'perm' | 'review' = 'users';

  departmentId: number | null = null;
  departmentName = '';
  teamName = '';
  selectedRoleNames: string[] = [];
  approvalLevelIds: number[] = [];

  canOpenPermissions = false;
  canOpenReview = false;

  reviewUserData: any = null;
  reviewPermissionData: any[] = [];

  finalUserPayload: any = null;
  finalPermissionPayload: any[] = [];

  constructor(
    private router: Router,
    private userService: UserService
  ) {}

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  handleContext(e: UserContextEvent): void {
    this.departmentId = e.departmentId;
    this.departmentName = e.departmentName || '';
    this.teamName = e.teamName || '';
    this.selectedRoleNames = e.selectedRoleNames || [];
    this.approvalLevelIds = e.approvalLevelIds || [];
    this.canOpenPermissions = !!this.departmentId;

    this.captureReviewUser();
  }

  handleNext(e: UserContextEvent): void {
    this.handleContext(e);

    if (!this.canOpenPermissions) {
      Swal.fire({
        icon: 'warning',
        title: 'Select Department',
        text: 'Please select Department before continuing.'
      });
      return;
    }

    this.captureReviewUser();
    this.activeTab = 'perm';
  }

  goUsers(): void {
    this.activeTab = 'users';
  }

  goPermissions(): void {
    if (!this.canOpenPermissions) {
      Swal.fire({
        icon: 'warning',
        title: 'Incomplete Setup',
        text: 'Please complete Account Details first.'
      });
      return;
    }

    this.activeTab = 'perm';
  }

  goReview(): void {
    if (!this.canOpenPermissions) {
      Swal.fire({
        icon: 'warning',
        title: 'Incomplete Setup',
        text: 'Please complete Account Details first.'
      });
      return;
    }

    this.captureReviewUser();
    this.captureReviewPermissions();

    this.canOpenReview = true;
    this.activeTab = 'review';
  }

  onPermissionPrevious(): void {
    this.activeTab = 'users';
  }

  onPermissionNext(): void {
    this.captureReviewUser();
    this.captureReviewPermissions();

    this.canOpenReview = true;
    this.activeTab = 'review';
  }

  private captureReviewUser(): void {
    if (!this.userFormComp?.form) return;

    const form = this.userFormComp.form;
    const raw = form.getRawValue();

    const deptId = Number(raw.departmentId) || null;
    const locId = Number(raw.locationId) || null;

    const dept = (this.userFormComp.departments || []).find((x: any) => +x.id === +deptId);
    const loc = (this.userFormComp.locations || []).find((x: any) => +x.id === +locId);

    this.reviewUserData = {
      username: raw.username || '-',
      email: raw.email || '-',
      department: dept?.name || dept?.departmentName || this.departmentName || '-',
      location: loc?.name || '-',
      team: this.teamName || '-',
      roles: this.selectedRoleNames?.length ? this.selectedRoleNames.join(', ') : '-'
    };

    if (typeof this.userFormComp.buildUserPayload === 'function') {
      this.finalUserPayload = this.userFormComp.buildUserPayload();
    }
  }

  private captureReviewPermissions(): void {
    if (!this.rolesComp) {
      this.reviewPermissionData = [];
      this.finalPermissionPayload = [];
      return;
    }

    const rows = this.rolesComp.rows || [];
    const modules = this.rolesComp.modules || [];
    const grouped: any[] = [];

    modules.forEach((m: any) => {
      const items = rows.filter((r: any) => r.moduleId === m.id);

      if (items.length > 0) {
        grouped.push({
          moduleTitle: m.title,
          count: items.length
        });
      }
    });

    this.reviewPermissionData = grouped;

    if (typeof this.rolesComp.getPermissionPayload === 'function') {
      this.finalPermissionPayload = this.rolesComp.getPermissionPayload() || [];
    }
  }

  submitAll(): void {
    if (!this.userFormComp?.form) return;

    this.userFormComp.form.markAllAsTouched();

    const passwordInvalid =
      (!this.userFormComp.isEdit && this.userFormComp.form.get('password')?.invalid) ||
      (this.userFormComp.isEdit &&
        this.userFormComp.canEditPassword &&
        this.userFormComp.form.get('password')?.invalid);

    if (
      this.userFormComp.form.get('username')?.invalid ||
      this.userFormComp.form.get('email')?.invalid ||
      this.userFormComp.form.get('departmentId')?.invalid ||
      this.userFormComp.form.get('locationId')?.invalid ||
      passwordInvalid
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid User Details',
        text: 'Please complete required fields in Account Details.'
      });
      this.activeTab = 'users';
      return;
    }

    this.captureReviewUser();
    this.captureReviewPermissions();

    const payload = {
      user: this.finalUserPayload,
      permissions: this.finalPermissionPayload || []
    };

    console.log('FINAL SUBMIT PAYLOAD', payload);

    Swal.fire({
      title: this.userFormComp.isEdit ? 'Updating...' : 'Saving...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const req = this.userFormComp.isEdit
      ? this.userService.updateUserAccessWizard(this.userFormComp.id, payload)
      : this.userService.submitUserAccessWizard(payload);

    req.subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: res?.message || (this.userFormComp.isEdit
            ? 'User access updated successfully.'
            : 'User access saved successfully.')
        }).then(() => {
          this.router.navigate(['/admin/users']);
        });
      },
      error: (err) => {
        console.error('SUBMIT ERROR', err);
        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text:
            err?.error?.message ||
            err?.error?.title ||
            err?.message ||
            'Something went wrong while saving.'
        });
      }
    });
  }
}