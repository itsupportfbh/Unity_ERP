import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerMasterListComponent } from './customer-master-list.component';

describe('CustomerMasterListComponent', () => {
  let component: CustomerMasterListComponent;
  let fixture: ComponentFixture<CustomerMasterListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CustomerMasterListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerMasterListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
