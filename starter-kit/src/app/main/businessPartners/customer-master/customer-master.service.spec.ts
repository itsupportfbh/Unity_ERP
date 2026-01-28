import { TestBed } from '@angular/core/testing';

import { CustomerMasterService } from './customer-master.service';

describe('CustomerMasterService', () => {
  let service: CustomerMasterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomerMasterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
