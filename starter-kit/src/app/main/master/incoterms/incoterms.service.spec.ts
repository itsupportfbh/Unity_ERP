import { TestBed } from '@angular/core/testing';

import { IncotermsService } from './incoterms.service';

describe('IncotermsService', () => {
  let service: IncotermsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IncotermsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
