import { TestBed } from '@angular/core/testing';

import { ChartofaccountService } from './chartofaccount.service';

describe('ChartofaccountService', () => {
  let service: ChartofaccountService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChartofaccountService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
