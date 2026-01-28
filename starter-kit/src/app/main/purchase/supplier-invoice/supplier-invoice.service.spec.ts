import { TestBed } from '@angular/core/testing';

import { SupplierInvoiceService } from './supplier-invoice.service';

describe('SupplierInvoiceService', () => {
  let service: SupplierInvoiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupplierInvoiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
