import { TestBed } from '@angular/core/testing';

import { SupplierGroupsService } from './supplier-groups.service';

describe('SupplierGroupsService', () => {
  let service: SupplierGroupsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupplierGroupsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
