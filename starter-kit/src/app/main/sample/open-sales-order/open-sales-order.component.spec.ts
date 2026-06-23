import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenSalesOrderComponent } from './open-sales-order.component';

describe('OpenSalesOrderComponent', () => {
  let component: OpenSalesOrderComponent;
  let fixture: ComponentFixture<OpenSalesOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OpenSalesOrderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpenSalesOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
