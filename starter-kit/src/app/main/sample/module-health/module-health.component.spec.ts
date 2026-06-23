import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModuleHealthComponent } from './module-health.component';

describe('ModuleHealthComponent', () => {
  let component: ModuleHealthComponent;
  let fixture: ComponentFixture<ModuleHealthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModuleHealthComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModuleHealthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
