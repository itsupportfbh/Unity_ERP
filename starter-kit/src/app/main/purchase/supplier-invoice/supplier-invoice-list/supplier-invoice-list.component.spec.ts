import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupplierInvoiceListComponent } from './supplier-invoice-list.component';

describe('SupplierInvoiceListComponent', () => {
  let component: SupplierInvoiceListComponent;
  let fixture: ComponentFixture<SupplierInvoiceListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SupplierInvoiceListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupplierInvoiceListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
