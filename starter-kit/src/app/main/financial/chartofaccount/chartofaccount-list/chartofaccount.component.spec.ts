import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChartofaccountComponent } from './chartofaccount.component';

describe('ChartofaccountComponent', () => {
  let component: ChartofaccountComponent;
  let fixture: ComponentFixture<ChartofaccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChartofaccountComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChartofaccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
