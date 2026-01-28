import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuotationscreateComponent } from './quotationscreate.component';

describe('QuotationscreateComponent', () => {
  let component: QuotationscreateComponent;
  let fixture: ComponentFixture<QuotationscreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QuotationscreateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuotationscreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
