import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ARAPHealthComponent } from './ar-ap-health.component';

describe('ARAPHealthComponent', () => {
  let component: ARAPHealthComponent;
  let fixture: ComponentFixture<ARAPHealthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ARAPHealthComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ARAPHealthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
