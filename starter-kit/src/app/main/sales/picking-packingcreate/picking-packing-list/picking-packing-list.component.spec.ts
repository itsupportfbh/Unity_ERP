import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PickingPackingListComponent } from './picking-packing-list.component';

describe('PickingPackingListComponent', () => {
  let component: PickingPackingListComponent;
  let fixture: ComponentFixture<PickingPackingListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PickingPackingListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PickingPackingListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
