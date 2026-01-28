import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemTypeComponent } from './item-type.component';

describe('ItemTypeComponent', () => {
  let component: ItemTypeComponent;
  let fixture: ComponentFixture<ItemTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ItemTypeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
