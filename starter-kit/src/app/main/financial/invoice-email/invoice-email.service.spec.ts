import { TestBed } from '@angular/core/testing';

import { InvoiceEmailService } from './invoice-email.service';

describe('InvoiceEmailService', () => {
  let service: InvoiceEmailService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InvoiceEmailService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
