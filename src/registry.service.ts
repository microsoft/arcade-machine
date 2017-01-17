import { IArcHandler } from './model';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

/**
 * The Registry keeps track of services of `arc` directives present in the DOM.
 */
@Injectable()
export class RegistryService {

  private static arcs = new Map<HTMLElement, IArcHandler>();

  /**
   * Subject on which observable can request focus.
   */
  public readonly setFocus = new BehaviorSubject<HTMLElement>(null);

  /**
   * Stores a directive into the registry.
   */
  public add(arc: IArcHandler) { RegistryService.arcs.set(arc.getElement(), arc); }

  /**
   * Removes a directive from the registry.
   */
  public remove(arc: IArcHandler) { RegistryService.arcs.delete(arc.getElement()); }

  /**
   * Returns the ArcDirective associated with the element. Returns
   * undefined if the element has no associated arc.
   */
  public find(el: HTMLElement) { return RegistryService.arcs.get(el); }
}
