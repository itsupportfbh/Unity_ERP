import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionscreateComponent } from './permissionscreate.component';

describe('PermissionscreateComponent', () => {
  let component: PermissionscreateComponent;
  let fixture: ComponentFixture<PermissionscreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PermissionscreateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermissionscreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
