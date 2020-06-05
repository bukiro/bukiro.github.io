/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { FeatComponent } from './feat.component';

describe('FeatComponent', () => {
  let component: FeatComponent;
  let fixture: ComponentFixture<FeatComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FeatComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});