import { TestBed } from '@angular/core/testing';

import { GstLockService } from './gst-lock.service';

describe('GstLockService', () => {
  let service: GstLockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GstLockService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
