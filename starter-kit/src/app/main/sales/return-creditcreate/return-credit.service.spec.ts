import { TestBed } from '@angular/core/testing';

import { ReturnCreditService } from './return-credit.service';

describe('ReturnCreditService', () => {
  let service: ReturnCreditService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReturnCreditService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
