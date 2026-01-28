import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryorderlistComponent } from './deliveryorderlist.component';

describe('DeliveryorderlistComponent', () => {
  let component: DeliveryorderlistComponent;
  let fixture: ComponentFixture<DeliveryorderlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeliveryorderlistComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryorderlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
