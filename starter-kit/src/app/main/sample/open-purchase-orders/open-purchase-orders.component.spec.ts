import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenPurchaseOrdersComponent } from './open-purchase-orders.component';

describe('OpenPurchaseOrdersComponent', () => {
  let component: OpenPurchaseOrdersComponent;
  let fixture: ComponentFixture<OpenPurchaseOrdersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OpenPurchaseOrdersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpenPurchaseOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
