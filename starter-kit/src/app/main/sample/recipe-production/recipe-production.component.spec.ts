import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeProductionComponent } from './recipe-production.component';

describe('RecipeProductionComponent', () => {
  let component: RecipeProductionComponent;
  let fixture: ComponentFixture<RecipeProductionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RecipeProductionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeProductionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
