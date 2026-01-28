import { TestBed } from '@angular/core/testing';

import { DeliveryorderService } from './deliveryorder.service';

describe('DeliveryorderService', () => {
  let service: DeliveryorderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeliveryorderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
