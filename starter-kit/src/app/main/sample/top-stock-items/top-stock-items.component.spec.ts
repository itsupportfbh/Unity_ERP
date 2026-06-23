import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopStockItemsComponent } from './top-stock-items.component';

describe('TopStockItemsComponent', () => {
  let component: TopStockItemsComponent;
  let fixture: ComponentFixture<TopStockItemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TopStockItemsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopStockItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
