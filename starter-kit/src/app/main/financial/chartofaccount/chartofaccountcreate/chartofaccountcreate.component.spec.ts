import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChartofaccountcreateComponent } from './chartofaccountcreate.component';

describe('ChartofaccountcreateComponent', () => {
  let component: ChartofaccountcreateComponent;
  let fixture: ComponentFixture<ChartofaccountcreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChartofaccountcreateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChartofaccountcreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
