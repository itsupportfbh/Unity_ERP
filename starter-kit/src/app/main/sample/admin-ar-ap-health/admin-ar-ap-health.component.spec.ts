import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminARAPHealthComponent } from './admin-ar-ap-health.component';

describe('AdminARAPHealthComponent', () => {
  let component: AdminARAPHealthComponent;
  let fixture: ComponentFixture<AdminARAPHealthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminARAPHealthComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminARAPHealthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
