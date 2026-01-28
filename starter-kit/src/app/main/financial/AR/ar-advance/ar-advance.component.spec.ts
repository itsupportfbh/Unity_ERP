import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArAdvanceComponent } from './ar-advance.component';

describe('ArAdvanceComponent', () => {
  let component: ArAdvanceComponent;
  let fixture: ComponentFixture<ArAdvanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ArAdvanceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArAdvanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
