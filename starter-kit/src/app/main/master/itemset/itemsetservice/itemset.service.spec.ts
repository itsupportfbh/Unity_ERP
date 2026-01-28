import { TestBed } from '@angular/core/testing';

import { ItemsetService } from './itemset.service';

describe('ItemsetService', () => {
  let service: ItemsetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ItemsetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
