import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesinvoicelistComponent } from './salesinvoicelist.component';

describe('SalesinvoicelistComponent', () => {
  let component: SalesinvoicelistComponent;
  let fixture: ComponentFixture<SalesinvoicelistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SalesinvoicelistComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesinvoicelistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
