import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoreInchargeComponent } from './store-incharge.component';

describe('StoreInchargeComponent', () => {
  let component: StoreInchargeComponent;
  let fixture: ComponentFixture<StoreInchargeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StoreInchargeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StoreInchargeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
