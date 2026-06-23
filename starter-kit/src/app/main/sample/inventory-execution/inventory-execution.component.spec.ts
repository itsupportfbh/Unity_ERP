import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryExecutionComponent } from './inventory-execution.component';

describe('InventoryExecutionComponent', () => {
  let component: InventoryExecutionComponent;
  let fixture: ComponentFixture<InventoryExecutionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InventoryExecutionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryExecutionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
