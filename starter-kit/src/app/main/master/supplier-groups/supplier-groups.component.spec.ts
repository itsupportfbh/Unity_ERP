import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupplierGroupsComponent } from './supplier-groups.component';

describe('SupplierGroupsComponent', () => {
  let component: SupplierGroupsComponent;
  let fixture: ComponentFixture<SupplierGroupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SupplierGroupsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupplierGroupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
