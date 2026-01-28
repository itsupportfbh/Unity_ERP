import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfitlossReportComponent } from './profitloss-report.component';

describe('ProfitlossReportComponent', () => {
  let component: ProfitlossReportComponent;
  let fixture: ComponentFixture<ProfitlossReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProfitlossReportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfitlossReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
