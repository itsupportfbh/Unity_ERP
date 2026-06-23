import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ARAPAgingComponent } from './ar-ap-aging.component';

describe('ARAPAgingComponent', () => {
  let component: ARAPAgingComponent;
  let fixture: ComponentFixture<ARAPAgingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ARAPAgingComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ARAPAgingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
