import { TestBed } from '@angular/core/testing';

import { PeriodCloseFxService } from './period-close-fx.service';

describe('PeriodCloseFxService', () => {
  let service: PeriodCloseFxService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PeriodCloseFxService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
