import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExchangeRateMasterComponent } from './exchange-rate-master.component';

describe('ExchangeRateMasterComponent', () => {
  let component: ExchangeRateMasterComponent;
  let fixture: ComponentFixture<ExchangeRateMasterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExchangeRateMasterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExchangeRateMasterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
