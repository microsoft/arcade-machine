import { directiveName, IArcDirective } from './model';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

/**
 * The Registry keeps track of services of `arc` directives present in the DOM.
 */
@Injectable()
export class RegistryService {

  private static arcs = new Map<HTMLElement, IArcDirective>();

  /**
   * Subject on which observable can request focus.
   */
  public readonly setFocus = new BehaviorSubject<HTMLElement>(null);

  /**
   * Stores a directive into the registry.
   */
  public add(arc: IArcDirective) { RegistryService.arcs.set(arc.getElement(), arc); }

  /**
   * Removes a directive from the registry.
   */
  public remove(arc: IArcDirective) { RegistryService.arcs.delete(arc.getElement()); }

  /**
   * Returns the ArcDirective associated with the element. Returns
   * undefined if the element has no associated arc.
   */
  public find(el: HTMLElement) {
    if (!el.hasAttribute(directiveName)) {
      return undefined;
    }

    return RegistryService.arcs.get(el);
  }
}
