import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReturnCreditcreateComponent } from './return-creditcreate.component';

describe('ReturnCreditcreateComponent', () => {
  let component: ReturnCreditcreateComponent;
  let fixture: ComponentFixture<ReturnCreditcreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReturnCreditcreateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReturnCreditcreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
