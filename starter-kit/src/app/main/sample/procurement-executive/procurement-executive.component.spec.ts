import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcurementExecutiveComponent } from './procurement-executive.component';

describe('ProcurementExecutiveComponent', () => {
  let component: ProcurementExecutiveComponent;
  let fixture: ComponentFixture<ProcurementExecutiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProcurementExecutiveComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcurementExecutiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
