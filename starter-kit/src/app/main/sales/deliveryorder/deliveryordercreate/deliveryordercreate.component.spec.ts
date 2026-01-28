import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryordercreateComponent } from './deliveryordercreate.component';

describe('DeliveryordercreateComponent', () => {
  let component: DeliveryordercreateComponent;
  let fixture: ComponentFixture<DeliveryordercreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeliveryordercreateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryordercreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
