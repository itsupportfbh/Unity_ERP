import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsAvarageMarginComponent } from './reports-avarage-margin.component';

describe('ReportsAvarageMarginComponent', () => {
  let component: ReportsAvarageMarginComponent;
  let fixture: ComponentFixture<ReportsAvarageMarginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportsAvarageMarginComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsAvarageMarginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
