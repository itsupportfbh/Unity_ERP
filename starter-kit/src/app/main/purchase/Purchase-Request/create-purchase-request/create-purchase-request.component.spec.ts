import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatePurchaseRequestComponent } from './create-purchase-request.component';

describe('CreatePurchaseRequestComponent', () => {
  let component: CreatePurchaseRequestComponent;
  let fixture: ComponentFixture<CreatePurchaseRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreatePurchaseRequestComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatePurchaseRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
