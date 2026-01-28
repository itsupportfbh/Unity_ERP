import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedcreateComponent } from './sharedcreate.component';

describe('SharedcreateComponent', () => {
  let component: SharedcreateComponent;
  let fixture: ComponentFixture<SharedcreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SharedcreateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SharedcreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
