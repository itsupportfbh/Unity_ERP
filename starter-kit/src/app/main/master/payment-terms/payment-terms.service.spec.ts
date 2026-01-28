import { TestBed } from '@angular/core/testing';

import { PaymentTermsService } from './payment-terms.service';

describe('PaymentTermsService', () => {
  let service: PaymentTermsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentTermsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
