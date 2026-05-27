import { TestBed } from '@angular/core/testing';

import { ExchangeRateMasterService } from './exchange-rate-master.service';

describe('ExchangeRateMasterService', () => {
  let service: ExchangeRateMasterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExchangeRateMasterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
