import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WarehousSummaryComponent } from './warehous-summary.component';

describe('WarehousSummaryComponent', () => {
  let component: WarehousSummaryComponent;
  let fixture: ComponentFixture<WarehousSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WarehousSummaryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WarehousSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
