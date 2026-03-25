import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UomconversionComponent } from './uomconversion.component';

describe('UomconversionComponent', () => {
  let component: UomconversionComponent;
  let fixture: ComponentFixture<UomconversionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UomconversionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UomconversionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
