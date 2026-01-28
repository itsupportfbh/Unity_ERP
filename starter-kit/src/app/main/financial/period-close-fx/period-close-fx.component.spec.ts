import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PeriodCloseFxComponent } from './period-close-fx.component';

describe('PeriodCloseFxComponent', () => {
  let component: PeriodCloseFxComponent;
  let fixture: ComponentFixture<PeriodCloseFxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PeriodCloseFxComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PeriodCloseFxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
