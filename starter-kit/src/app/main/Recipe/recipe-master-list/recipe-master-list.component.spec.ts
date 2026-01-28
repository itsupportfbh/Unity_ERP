import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeMasterListComponent } from './recipe-master-list.component';

describe('RecipeMasterListComponent', () => {
  let component: RecipeMasterListComponent;
  let fixture: ComponentFixture<RecipeMasterListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RecipeMasterListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeMasterListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
