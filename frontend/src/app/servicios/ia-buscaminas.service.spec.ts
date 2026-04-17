import { TestBed } from '@angular/core/testing';

import { IaBuscaminasService } from './ia-buscaminas.service';

describe('IaBuscaminasService', () => {
  let service: IaBuscaminasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IaBuscaminasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
