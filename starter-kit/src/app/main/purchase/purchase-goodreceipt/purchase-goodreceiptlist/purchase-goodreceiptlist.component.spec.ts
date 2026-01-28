import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseGoodreceiptlistComponent } from './purchase-goodreceiptlist.component';

describe('PurchaseGoodreceiptlistComponent', () => {
  let component: PurchaseGoodreceiptlistComponent;
  let fixture: ComponentFixture<PurchaseGoodreceiptlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PurchaseGoodreceiptlistComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseGoodreceiptlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
