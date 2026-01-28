import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceGstdetailsComponent } from './finance-gstdetails.component';

describe('FinanceGstdetailsComponent', () => {
  let component: FinanceGstdetailsComponent;
  let fixture: ComponentFixture<FinanceGstdetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FinanceGstdetailsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceGstdetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
