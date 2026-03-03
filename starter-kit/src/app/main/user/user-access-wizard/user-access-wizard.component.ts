import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';

export interface UserContextEvent {
  departmentId: number | null;
  departmentName: string;
  approvalLevelIds: number[];
  selectedRoleNames: string[];
  teamName: string; // Sales Team / Purchase Team / Finance Team / Admin
}

@Component({
  selector: 'app-user-access-wizard',
  templateUrl: './user-access-wizard.component.html',
  styleUrls: ['./user-access-wizard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class UserAccessWizardComponent {
  activeTab: 'users' | 'perm' = 'users';

  departmentName = '';
  teamName = '';
  selectedRoleNames: string[] = [];

  canOpenPermissions = false;

  constructor(private router: Router) {}

  goBack() {
    this.router.navigate(['/admin/users']);
  }

  handleContext(e: UserContextEvent) {
    this.departmentName = e.departmentName || '';
    this.teamName = e.teamName || '';
    this.selectedRoleNames = e.selectedRoleNames || [];

    this.canOpenPermissions = !!(this.teamName && this.selectedRoleNames.length);
  }

  handleNext(e: UserContextEvent) {
    this.handleContext(e);
    if (!this.canOpenPermissions) return;
    this.activeTab = 'perm';
  }
}