import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsDeliveriesComponent } from './reports-deliveries.component';

describe('ReportsDeliveriesComponent', () => {
  let component: ReportsDeliveriesComponent;
  let fixture: ComponentFixture<ReportsDeliveriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportsDeliveriesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsDeliveriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
