import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesManegerDashboardComponent } from './sales-maneger-dashboard.component';

describe('SalesManegerDashboardComponent', () => {
  let component: SalesManegerDashboardComponent;
  let fixture: ComponentFixture<SalesManegerDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SalesManegerDashboardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesManegerDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
