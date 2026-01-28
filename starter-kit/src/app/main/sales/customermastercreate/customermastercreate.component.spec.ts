import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomermastercreateComponent } from './customermastercreate.component';

describe('CustomermastercreateComponent', () => {
  let component: CustomermastercreateComponent;
  let fixture: ComponentFixture<CustomermastercreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CustomermastercreateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomermastercreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
