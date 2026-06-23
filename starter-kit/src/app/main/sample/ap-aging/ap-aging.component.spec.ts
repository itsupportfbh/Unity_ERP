import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApAgingComponent } from './ap-aging.component';

describe('ApAgingComponent', () => {
  let component: ApAgingComponent;
  let fixture: ComponentFixture<ApAgingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ApAgingComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApAgingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
