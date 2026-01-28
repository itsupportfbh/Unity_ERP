import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApAdvanceComponent } from './ap-advance.component';

describe('ApAdvanceComponent', () => {
  let component: ApAdvanceComponent;
  let fixture: ComponentFixture<ApAdvanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ApAdvanceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApAdvanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
