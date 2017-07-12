import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { IArcHandler } from './model';

/**
 * The Registry keeps track of services of `arc` directives present in the DOM.
 */
@Injectable()
export class RegistryService {
  private static arcs = new Map<HTMLElement, IArcHandler>();
  private excludedDeepCount = 0;

  /**
   * Subject on which observable can request focus.
   */
  public readonly setFocus = new BehaviorSubject<HTMLElement | null>(null);

  /**
   * Stores a directive into the registry.
   */
  public add(arc: IArcHandler) {
    RegistryService.arcs.set(arc.getElement(), arc);
    if (arc.exclude && arc.exclude()) {
      this.excludedDeepCount++;
    }
  }

  /**
   * Removes a directive from the registry.
   */
  public remove(arc: IArcHandler) {
    RegistryService.arcs.delete(arc.getElement());
    if (arc.exclude && arc.exclude()) {
      this.excludedDeepCount--;
    }
  }

  /**
   * Returns the ArcDirective associated with the element. Returns
   * undefined if the element has no associated arc.
   */
  public find(el: HTMLElement) {
    return RegistryService.arcs.get(el);
  }

  /**
   * Returns whether there are any elements with deep exclusions in the registry.
   */
  public hasExcludedDeepElements(): boolean { return this.excludedDeepCount > 0; }
}
