import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceTaxcodesComponent } from './finance-taxcodes.component';

describe('FinanceTaxcodesComponent', () => {
  let component: FinanceTaxcodesComponent;
  let fixture: ComponentFixture<FinanceTaxcodesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FinanceTaxcodesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceTaxcodesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
