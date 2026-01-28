import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinancereportsComponent } from './financereports.component';

describe('FinancereportsComponent', () => {
  let component: FinancereportsComponent;
  let fixture: ComponentFixture<FinancereportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FinancereportsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinancereportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
