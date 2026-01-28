import { TestBed } from '@angular/core/testing';

import { CoastingMethodService } from './coasting-method.service';

describe('CoastingMethodService', () => {
  let service: CoastingMethodService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoastingMethodService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
