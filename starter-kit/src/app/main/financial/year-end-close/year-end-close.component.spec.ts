import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YearEndCloseComponent } from './year-end-close.component';

describe('YearEndCloseComponent', () => {
  let component: YearEndCloseComponent;
  let fixture: ComponentFixture<YearEndCloseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ YearEndCloseComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(YearEndCloseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
