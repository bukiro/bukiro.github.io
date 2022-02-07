/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { ActivitiesService } from 'src/app/services/activities.service';

describe('Service: Activities', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ActivitiesService]
    });
  });

  it('should ...', inject([ActivitiesService], (service: ActivitiesService) => {
    expect(service).toBeTruthy();
  }));
});