import { TestBed } from '@angular/core/testing';

import { CustomerGroupsService } from './customer-groups.service';

describe('CustomerGroupsService', () => {
  let service: CustomerGroupsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomerGroupsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
