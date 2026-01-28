import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OcruploadmodalComponent } from './ocruploadmodal.component';

describe('OcruploadmodalComponent', () => {
  let component: OcruploadmodalComponent;
  let fixture: ComponentFixture<OcruploadmodalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OcruploadmodalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OcruploadmodalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
