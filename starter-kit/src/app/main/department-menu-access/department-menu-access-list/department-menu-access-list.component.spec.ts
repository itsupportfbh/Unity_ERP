import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepartmentMenuAccessListComponent } from './department-menu-access-list.component';

describe('DepartmentMenuAccessListComponent', () => {
  let component: DepartmentMenuAccessListComponent;
  let fixture: ComponentFixture<DepartmentMenuAccessListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DepartmentMenuAccessListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepartmentMenuAccessListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
