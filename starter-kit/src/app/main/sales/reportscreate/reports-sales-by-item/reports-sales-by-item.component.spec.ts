import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsSalesByItemComponent } from './reports-sales-by-item.component';

describe('ReportsSalesByItemComponent', () => {
  let component: ReportsSalesByItemComponent;
  let fixture: ComponentFixture<ReportsSalesByItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportsSalesByItemComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsSalesByItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
