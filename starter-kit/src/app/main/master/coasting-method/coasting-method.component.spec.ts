import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoastingMethodComponent } from './coasting-method.component';

describe('CoastingMethodComponent', () => {
  let component: CoastingMethodComponent;
  let fixture: ComponentFixture<CoastingMethodComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CoastingMethodComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoastingMethodComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
