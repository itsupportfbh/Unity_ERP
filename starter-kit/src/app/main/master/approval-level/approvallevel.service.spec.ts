import { TestBed } from '@angular/core/testing';

import { ApprovallevelService } from './approvallevel.service';

describe('ApprovallevelService', () => {
  let service: ApprovallevelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApprovallevelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
