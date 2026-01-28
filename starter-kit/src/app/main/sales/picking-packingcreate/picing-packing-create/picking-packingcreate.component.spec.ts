import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PickingPackingcreateComponent } from './picking-packingcreate.component';

describe('PickingPackingcreateComponent', () => {
  let component: PickingPackingcreateComponent;
  let fixture: ComponentFixture<PickingPackingcreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PickingPackingcreateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PickingPackingcreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
