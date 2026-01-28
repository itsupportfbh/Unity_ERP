import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionForecastComponent } from './collection-forecast.component';

describe('CollectionForecastComponent', () => {
  let component: CollectionForecastComponent;
  let fixture: ComponentFixture<CollectionForecastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CollectionForecastComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollectionForecastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
