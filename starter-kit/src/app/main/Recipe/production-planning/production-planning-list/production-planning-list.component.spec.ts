import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductionPlanningListComponent } from './production-planning-list.component';

describe('ProductionPlanningListComponent', () => {
  let component: ProductionPlanningListComponent;
  let fixture: ComponentFixture<ProductionPlanningListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProductionPlanningListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductionPlanningListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
