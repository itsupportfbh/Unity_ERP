import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceApAgingComponent } from './finance-ap-aging.component';

describe('FinanceApAgingComponent', () => {
  let component: FinanceApAgingComponent;
  let fixture: ComponentFixture<FinanceApAgingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FinanceApAgingComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceApAgingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
