import { TestBed } from '@angular/core/testing';

import { GstReturnsService } from './gst-returns.service';

describe('GstReturnsService', () => {
  let service: GstReturnsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GstReturnsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
