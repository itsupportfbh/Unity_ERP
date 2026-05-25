import { TestBed } from '@angular/core/testing';

import { YearEndCloseService } from './year-end-close.service';

describe('YearEndCloseService', () => {
  let service: YearEndCloseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(YearEndCloseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
