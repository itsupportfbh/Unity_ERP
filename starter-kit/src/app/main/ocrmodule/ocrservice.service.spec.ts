import { TestBed } from '@angular/core/testing';

import { OcrserviceService } from './ocrservice.service';

describe('OcrserviceService', () => {
  let service: OcrserviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OcrserviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
