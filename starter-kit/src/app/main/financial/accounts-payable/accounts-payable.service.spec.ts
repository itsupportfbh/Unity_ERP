import { TestBed } from '@angular/core/testing';

import { AccountsPayableService } from './accounts-payable.service';

describe('AccountsPayableService', () => {
  let service: AccountsPayableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountsPayableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
