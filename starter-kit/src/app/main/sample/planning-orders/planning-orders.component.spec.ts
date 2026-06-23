import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningOrdersComponent } from './planning-orders.component';

describe('PlanningOrdersComponent', () => {
  let component: PlanningOrdersComponent;
  let fixture: ComponentFixture<PlanningOrdersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlanningOrdersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanningOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
