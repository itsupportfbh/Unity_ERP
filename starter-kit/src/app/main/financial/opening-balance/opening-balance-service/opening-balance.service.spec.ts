import { TestBed } from '@angular/core/testing';

import { OpeningBalanceService } from './opening-balance.service';

describe('OpeningBalanceService', () => {
  let service: OpeningBalanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpeningBalanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
