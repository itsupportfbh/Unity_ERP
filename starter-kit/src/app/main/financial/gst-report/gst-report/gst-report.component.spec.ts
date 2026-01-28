import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GstReportComponent } from './gst-report.component';

describe('GstReportComponent', () => {
  let component: GstReportComponent;
  let fixture: ComponentFixture<GstReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GstReportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GstReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
