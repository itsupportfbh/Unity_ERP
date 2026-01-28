import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductionPlanningComponent } from './production-planning.component';

describe('ProductionPlanningComponent', () => {
  let component: ProductionPlanningComponent;
  let fixture: ComponentFixture<ProductionPlanningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProductionPlanningComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductionPlanningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
