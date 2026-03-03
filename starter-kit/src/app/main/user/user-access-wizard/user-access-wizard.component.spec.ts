import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserAccessWizardComponent } from './user-access-wizard.component';

describe('UserAccessWizardComponent', () => {
  let component: UserAccessWizardComponent;
  let fixture: ComponentFixture<UserAccessWizardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UserAccessWizardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserAccessWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
