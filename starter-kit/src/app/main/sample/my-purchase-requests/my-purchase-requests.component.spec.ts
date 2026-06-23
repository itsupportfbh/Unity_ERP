import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyPurchaseRequestsComponent } from './my-purchase-requests.component';

describe('MyPurchaseRequestsComponent', () => {
  let component: MyPurchaseRequestsComponent;
  let fixture: ComponentFixture<MyPurchaseRequestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MyPurchaseRequestsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyPurchaseRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
