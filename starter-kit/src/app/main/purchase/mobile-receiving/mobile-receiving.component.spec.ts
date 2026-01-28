import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileReceivingComponent } from './mobile-receiving.component';

describe('MobileReceivingComponent', () => {
  let component: MobileReceivingComponent;
  let fixture: ComponentFixture<MobileReceivingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MobileReceivingComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileReceivingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
