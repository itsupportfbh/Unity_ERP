import { TestBed } from '@angular/core/testing';

import { CustomermastercreateService } from './customermastercreate.service';

describe('CustomermastercreateService', () => {
  let service: CustomermastercreateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomermastercreateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
