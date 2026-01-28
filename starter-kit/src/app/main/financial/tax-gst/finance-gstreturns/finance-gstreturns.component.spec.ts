import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceGstreturnsComponent } from './finance-gstreturns.component';

describe('FinanceGstreturnsComponent', () => {
  let component: FinanceGstreturnsComponent;
  let fixture: ComponentFixture<FinanceGstreturnsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FinanceGstreturnsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceGstreturnsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
