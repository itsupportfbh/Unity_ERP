import { TestBed } from '@angular/core/testing';

import { StockIssueService } from './stock-issue.service';

describe('StockIssueService', () => {
  let service: StockIssueService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StockIssueService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
