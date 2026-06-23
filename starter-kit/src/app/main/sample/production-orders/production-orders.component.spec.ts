import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductionOrdersComponent } from './production-orders.component';

describe('ProductionOrdersComponent', () => {
  let component: ProductionOrdersComponent;
  let fixture: ComponentFixture<ProductionOrdersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProductionOrdersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductionOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
