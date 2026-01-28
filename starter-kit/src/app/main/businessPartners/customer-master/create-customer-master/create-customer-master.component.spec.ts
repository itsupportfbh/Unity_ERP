import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateCustomerMasterComponent } from './create-customer-master.component';

describe('CreateCustomerMasterComponent', () => {
  let component: CreateCustomerMasterComponent;
  let fixture: ComponentFixture<CreateCustomerMasterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateCustomerMasterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateCustomerMasterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
