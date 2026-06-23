import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryByCategoryComponent } from './inventory-by-category.component';

describe('InventoryByCategoryComponent', () => {
  let component: InventoryByCategoryComponent;
  let fixture: ComponentFixture<InventoryByCategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InventoryByCategoryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryByCategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
