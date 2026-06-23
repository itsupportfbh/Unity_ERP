import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllFinanceExceptionsComponent } from './all-finance-exceptions.component';

describe('AllFinanceExceptionsComponent', () => {
  let component: AllFinanceExceptionsComponent;
  let fixture: ComponentFixture<AllFinanceExceptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AllFinanceExceptionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllFinanceExceptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
