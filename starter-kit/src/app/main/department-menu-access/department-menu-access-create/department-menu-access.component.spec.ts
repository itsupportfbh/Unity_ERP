import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepartmentMenuAccessComponent } from './department-menu-access.component';

describe('DepartmentMenuAccessComponent', () => {
  let component: DepartmentMenuAccessComponent;
  let fixture: ComponentFixture<DepartmentMenuAccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DepartmentMenuAccessComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepartmentMenuAccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
