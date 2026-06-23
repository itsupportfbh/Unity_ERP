import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemWideExceptionsComponent } from './system-wide-exceptions.component';

describe('SystemWideExceptionsComponent', () => {
  let component: SystemWideExceptionsComponent;
  let fixture: ComponentFixture<SystemWideExceptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SystemWideExceptionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemWideExceptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
