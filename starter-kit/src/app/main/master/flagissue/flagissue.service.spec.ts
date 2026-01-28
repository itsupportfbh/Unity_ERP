import { TestBed } from '@angular/core/testing';

import { FlagissueService } from './flagissue.service';

describe('FlagissueService', () => {
  let service: FlagissueService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FlagissueService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
