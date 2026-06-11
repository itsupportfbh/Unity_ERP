import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceManagerDashboardComponent } from './finance-manager-dashboard.component';

describe('FinanceManagerDashboardComponent', () => {
  let component: FinanceManagerDashboardComponent;
  let fixture: ComponentFixture<FinanceManagerDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FinanceManagerDashboardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceManagerDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
