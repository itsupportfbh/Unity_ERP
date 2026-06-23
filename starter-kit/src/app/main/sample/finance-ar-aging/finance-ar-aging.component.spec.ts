import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceArAgingComponent } from './finance-ar-aging.component';

describe('FinanceArAgingComponent', () => {
  let component: FinanceArAgingComponent;
  let fixture: ComponentFixture<FinanceArAgingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FinanceArAgingComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceArAgingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
