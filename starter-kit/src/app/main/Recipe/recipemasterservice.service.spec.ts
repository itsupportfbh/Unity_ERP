import { TestBed } from '@angular/core/testing';

import { RecipemasterserviceService } from './recipemasterservice.service';

describe('RecipemasterserviceService', () => {
  let service: RecipemasterserviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecipemasterserviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
