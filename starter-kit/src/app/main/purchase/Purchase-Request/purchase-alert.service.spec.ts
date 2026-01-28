import { TestBed } from '@angular/core/testing';

import { PurchaseAlertService } from './purchase-alert.service';

describe('PurchaseAlertService', () => {
  let service: PurchaseAlertService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PurchaseAlertService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
