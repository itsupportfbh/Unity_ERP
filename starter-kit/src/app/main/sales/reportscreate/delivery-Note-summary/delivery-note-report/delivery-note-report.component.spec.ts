import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryNoteReportComponent } from './delivery-note-report.component';

describe('DeliveryNoteReportComponent', () => {
  let component: DeliveryNoteReportComponent;
  let fixture: ComponentFixture<DeliveryNoteReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeliveryNoteReportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryNoteReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
