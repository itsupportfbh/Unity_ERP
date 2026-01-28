import { TestBed } from '@angular/core/testing';

import { ProfitlossService } from './profitloss.service';

describe('ProfitlossService', () => {
  let service: ProfitlossService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfitlossService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
