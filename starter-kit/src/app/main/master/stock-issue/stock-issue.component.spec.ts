import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockIssueComponent } from './stock-issue.component';

describe('StockIssueComponent', () => {
  let component: StockIssueComponent;
  let fixture: ComponentFixture<StockIssueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StockIssueComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockIssueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
