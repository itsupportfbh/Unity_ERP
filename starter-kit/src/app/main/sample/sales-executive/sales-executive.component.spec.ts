import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesExecutiveComponent } from './sales-executive.component';

describe('SalesExecutiveComponent', () => {
  let component: SalesExecutiveComponent;
  let fixture: ComponentFixture<SalesExecutiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SalesExecutiveComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesExecutiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
