import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceExecutiveComponent } from './finance-executive.component';

describe('FinanceExecutiveComponent', () => {
  let component: FinanceExecutiveComponent;
  let fixture: ComponentFixture<FinanceExecutiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FinanceExecutiveComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceExecutiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
