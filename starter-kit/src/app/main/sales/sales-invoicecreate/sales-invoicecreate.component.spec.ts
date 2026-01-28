import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesInvoicecreateComponent } from './sales-invoicecreate.component';

describe('SalesInvoicecreateComponent', () => {
  let component: SalesInvoicecreateComponent;
  let fixture: ComponentFixture<SalesInvoicecreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SalesInvoicecreateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesInvoicecreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
