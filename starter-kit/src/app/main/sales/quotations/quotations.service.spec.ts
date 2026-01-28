import { TestBed } from '@angular/core/testing';

import { QuotationsService } from '../quotations.service';

describe('QuotationsService', () => {
  let service: QuotationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuotationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
