import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArAgingComponent } from './ar-aging.component';

describe('ArAgingComponent', () => {
  let component: ArAgingComponent;
  let fixture: ComponentFixture<ArAgingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ArAgingComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArAgingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
