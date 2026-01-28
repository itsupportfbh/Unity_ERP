import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionscreateComponent } from './collectionscreate.component';

describe('CollectionscreateComponent', () => {
  let component: CollectionscreateComponent;
  let fixture: ComponentFixture<CollectionscreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CollectionscreateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollectionscreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
