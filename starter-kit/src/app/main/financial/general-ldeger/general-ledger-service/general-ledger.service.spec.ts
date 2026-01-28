import { TestBed } from '@angular/core/testing';
import { GeneralLedgerService } from './general-ledger.service';

 

describe('GeneralLedgerService', () => {
  let service: GeneralLedgerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeneralLedgerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
