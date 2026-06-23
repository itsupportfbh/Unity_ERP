import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcurementManagerComponent } from './procurement-manager.component';

describe('ProcurementManagerComponent', () => {
  let component: ProcurementManagerComponent;
  let fixture: ComponentFixture<ProcurementManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProcurementManagerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcurementManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
