import { TestBed } from '@angular/core/testing';

import { PickingPackingService } from './picking-packing.service';

describe('PickingPackingService', () => {
  let service: PickingPackingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PickingPackingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
