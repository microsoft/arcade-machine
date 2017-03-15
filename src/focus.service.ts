import { Location } from '@angular/common';
import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';

import 'rxjs/add/operator/filter';

import { ArcEvent } from './event';
import { Direction } from './model';
import { RegistryService } from './registry.service';

const defaultFocusRoot = document.body;
// These factors can be tweaked to adjust which elements are favored by the focus algorithm
const scoringConstants = Object.freeze({
  primaryAxisDistanceWeight: 30,
  secondaryAxisDistanceWeight: 20,
  percentInHistoryShadowWeight: 100000,
});

const cssClass = Object.freeze({
  selected: 'arc--selected',
  direct: 'arc--selected-direct',
});

interface IFocusState {
  root: HTMLElement;
  focusedElem: HTMLElement;
}

interface IMutableClientRect {
  top: number;
  bottom: number;
  right: number;
  left: number;
  height: number;
  width: number;
}

interface IReducedClientRect {
  top: number;
  left: number;
  height: number;
  width: number;
}

// Default client rect to use. We set the top, left, bottom and right
// properties of the referenceBoundingRectangle to '-1' (as opposed to '0')
// because we want to make sure that even elements that are up to the edge
// of the screen can receive focus.
const defaultRect: ClientRect = Object.freeze({
  top: -1,
  bottom: -1,
  right: -1,
  left: -1,
  height: 0,
  width: 0,
});

// A list of aria `roles` which can receive focus.
const focusableRoles = Object.freeze([
  'button',
  'checkbox',
  'combobox',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'slider',
  'spinbutton',
  'tab',
  'textbox',
  'treeitem',
]);

function roundRect(rect: HTMLElement | ClientRect): ClientRect {
  if (rect instanceof HTMLElement) {
    rect = rect.getBoundingClientRect();
  }

  // There's rounding here because floating points make certain math not work.
  return {
    top: Math.floor(rect.top),
    bottom: Math.floor(rect.top + rect.height),
    right: Math.floor(rect.left + rect.width),
    left: Math.floor(rect.left),
    height: Math.floor(rect.height),
    width: Math.floor(rect.width),
  };
}

function calculatePercentInShadow(
  minReferenceCoord: number,
  maxReferenceCoord: number,
  minPotentialCoord: number,
  maxPotentialCoord: number,
) {
  /// Calculates the percentage of the potential element that is in the shadow of the reference element.
  if ((minReferenceCoord >= maxPotentialCoord) || (maxReferenceCoord <= minPotentialCoord)) {
    // Potential is not in the reference's shadow.
    return 0;
  }
  const pixelOverlap = Math.min(maxReferenceCoord, maxPotentialCoord) - Math.max(minReferenceCoord, minPotentialCoord);
  const shortEdge = Math.min(maxPotentialCoord - minPotentialCoord, maxReferenceCoord - minReferenceCoord);
  return shortEdge === 0 ? 0 : (pixelOverlap / shortEdge);
}

function calculateScore(
  direction: Direction,
  maxDistance: number,
  historyRect: ClientRect,
  referenceRect: ClientRect,
  potentialRect: ClientRect,
): number {
  let percentInShadow: number;
  let primaryAxisDistance: number;
  let secondaryAxisDistance = 0;
  let percentInHistoryShadow = 0;
  switch (direction) {
    case Direction.LEFT:
      // Make sure we don't evaluate any potential elements to the right of the reference element
      if (potentialRect.left >= referenceRect.left) {
        break;
      }
      percentInShadow = calculatePercentInShadow(referenceRect.top, referenceRect.bottom, potentialRect.top, potentialRect.bottom);
      primaryAxisDistance = referenceRect.left - potentialRect.right;
      if (percentInShadow > 0) {
        percentInHistoryShadow = calculatePercentInShadow(historyRect.top, historyRect.bottom, potentialRect.top, potentialRect.bottom);
      } else {
        // If the potential element is not in the shadow, then we calculate secondary axis distance
        secondaryAxisDistance = (referenceRect.bottom <= potentialRect.top)
          ? (potentialRect.top - referenceRect.bottom)
          : referenceRect.top - potentialRect.bottom;
      }
      break;

    case Direction.RIGHT:
      // Make sure we don't evaluate any potential elements to the left of the reference element
      if (potentialRect.right <= referenceRect.right) {
        break;
      }
      percentInShadow = calculatePercentInShadow(referenceRect.top, referenceRect.bottom, potentialRect.top, potentialRect.bottom);
      primaryAxisDistance = potentialRect.left - referenceRect.right;
      if (percentInShadow > 0) {
        percentInHistoryShadow = calculatePercentInShadow(historyRect.top, historyRect.bottom, potentialRect.top, potentialRect.bottom);
      } else {
        // If the potential element is not in the shadow, then we calculate secondary axis distance
        secondaryAxisDistance = (referenceRect.bottom <= potentialRect.top)
          ? (potentialRect.top - referenceRect.bottom)
          : referenceRect.top - potentialRect.bottom;
      }
      break;

    case Direction.UP:
      // Make sure we don't evaluate any potential elements below the reference element
      if (potentialRect.top >= referenceRect.top) {
        break;
      }
      percentInShadow = calculatePercentInShadow(referenceRect.left, referenceRect.right, potentialRect.left, potentialRect.right);
      primaryAxisDistance = referenceRect.top - potentialRect.bottom;
      if (percentInShadow > 0) {
        percentInHistoryShadow = calculatePercentInShadow(historyRect.left, historyRect.right, potentialRect.left, potentialRect.right);
      } else {
        // If the potential element is not in the shadow, then we calculate secondary axis distance
        secondaryAxisDistance = (referenceRect.right <= potentialRect.left)
          ? (potentialRect.left - referenceRect.right)
          : referenceRect.left - potentialRect.right;
      }
      break;

    case Direction.DOWN:
      // Make sure we don't evaluate any potential elements above the reference element
      if (potentialRect.bottom <= referenceRect.bottom) {
        break;
      }
      percentInShadow = calculatePercentInShadow(referenceRect.left, referenceRect.right, potentialRect.left, potentialRect.right);
      primaryAxisDistance = potentialRect.top - referenceRect.bottom;
      if (percentInShadow > 0) {
        percentInHistoryShadow = calculatePercentInShadow(historyRect.left, historyRect.right, potentialRect.left, potentialRect.right);
      } else {
        // If the potential element is not in the shadow, then we calculate secondary axis distance
        secondaryAxisDistance = (referenceRect.right <= potentialRect.left)
          ? (potentialRect.left - referenceRect.right)
          : referenceRect.left - potentialRect.right;
      }
      break;

    default:
      throw new Error(`Attempted to navigate to unknown direction ${direction}`);
  }

  if (primaryAxisDistance >= 0) {
    // The score needs to be a positive number so we make these distances positive numbers
    primaryAxisDistance = maxDistance - primaryAxisDistance;
    secondaryAxisDistance = maxDistance - secondaryAxisDistance;
    if (primaryAxisDistance >= 0 && secondaryAxisDistance >= 0) {
      // Potential elements in the shadow get a multiplier to their final score
      primaryAxisDistance += primaryAxisDistance * percentInShadow;
      return primaryAxisDistance * scoringConstants.primaryAxisDistanceWeight
        + secondaryAxisDistance * scoringConstants.secondaryAxisDistanceWeight
        + percentInHistoryShadow * scoringConstants.percentInHistoryShadowWeight;
    }
  }
  return 0;
}

/**
 * Returns the common ancestor in the DOM of two nodes. From:
 * http://stackoverflow.com/a/7648545
 */
function getCommonAncestor(a: HTMLElement, b: HTMLElement): HTMLElement {
  const mask = 0x10;
  while (a = a.parentElement) {
    if ((a.compareDocumentPosition(b) & mask) === mask) { // tslint:disable-line
      return a;
    }
  }
  return undefined;
}

/**
 * Returns if the direction is left/right/up/down.
 */
function isDirectional(ev: Direction) {
  return ev === Direction.LEFT
    || ev === Direction.RIGHT
    || ev === Direction.UP
    || ev === Direction.DOWN;
}

/**
 * Interpolation with quadratic speed up and slow down.
 */
function quad(start: number, end: number, progress: number): number {
  const diff = end - start;
  if (progress < 0.5) {
    return diff * (2 * progress * progress) + start;
  } else {
    const displaced = progress - 1;
    return diff * ((-2 * displaced * displaced) + 1) + start;
  }
}

/**
 * Returns whether the target DOM node is a child of the root.
 */
function isNodeAttached(node: HTMLElement, root: HTMLElement) {
  while (node && node !== root) {
    node = node.parentElement;
  }
  return node === root;
}

@Injectable()
export class FocusService {

  // Focus root, the service operates below here.
  private root: HTMLElement;
  public focusRoot: HTMLElement = defaultFocusRoot;
  // The previous rectange that the user had selected.
  private historyRect = defaultRect;
  // Subscription to focus update events.
  private registrySubscription: Subscription;

  // The currently selected element.
  public selected: HTMLElement;
  // Parents of the selected element.
  private parents: HTMLElement[] = [];
  // The client bounding rect when we first selected the element, cached
  // so that we can reuse it if the element gets detached.
  private referenceRect: ClientRect;
  private focusStack: IFocusState[] = [];

  constructor(
    private registry: RegistryService,
    private location: Location,
  ) { }

  public trapFocus(newRootElem: HTMLElement) {
    this.focusStack.push({
      root: this.focusRoot,
      focusedElem: this.selected,
    });
    this.focusRoot = newRootElem;
  }

  public releaseFocus(releaseElem?: HTMLElement, scrollSpeed: number = Infinity) {
    if (releaseElem) {
      if (releaseElem === this.focusRoot) {
        this.releaseFocus(null, scrollSpeed);
      }
      return;
    }

    const lastFocusState = this.focusStack.pop();
    if (lastFocusState) {
      this.focusRoot = lastFocusState.root;
      this.selectNode(lastFocusState.focusedElem, scrollSpeed);
    } else {
      console.warn('No more focus traps to release. Make sure you call trapFocus before using releaseFocus');
      this.clearAllTraps();
    }
  }

  /**
   * Useful for resetting all focus traps e.g. on page navigation
   */
  public clearAllTraps() {
    this.focusStack.length = 0;
    this.focusRoot = defaultFocusRoot;
  }

  /**
   * Sets the root element to use for focusing.
   */
  public setRoot(root: HTMLElement, scrollSpeed: number) {
    if (this.registrySubscription) {
      this.registrySubscription.unsubscribe();
    }

    this.root = root;
    this.registrySubscription = this.registry
      .setFocus
      .filter((el: HTMLElement) => !!el)
      .subscribe((el: HTMLElement) => this.selectNode(el, scrollSpeed));

    if (!this.selected) {
      return;
    }

    for (let el = this.selected; el !== root; el = el.parentElement) {
      if (!el) {
        this.setDefaultFocus(scrollSpeed);
        return;
      }
    }
  }

  /**
   * onFocusChange is called when any element in the DOM gains focus. We use
   * this is handle adjustments if the user interacts with other input
   * devices, or if other application logic requests focus.
   */
  public onFocusChange(focus: HTMLElement, scrollSpeed: number) {
    this.selectNode(focus, scrollSpeed);
  }

  /**
   * Updates the selected DOM node.
   */
  public selectNode(next: HTMLElement, scrollSpeed: number) {
    const { selected, parents } = this;
    if (selected === next) {
      return;
    }

    this.rescroll(next, scrollSpeed, this.root);

    const attached = selected && isNodeAttached(selected, this.root);
    if (!attached && parents) {
      parents.forEach(parent => parent.classList.remove(cssClass.selected));
    }

    this.parents = [];

    if (attached) {
      // Find the common ancestor of the next and currently selected element.
      // Remove selected classes in the current subtree, and add selected
      // classes in the other subtree. Trigger focus changes on every
      // element that we touch.
      selected.blur();

      const common = getCommonAncestor(next, selected);
      selected.classList.remove(cssClass.direct);
      for (let el = selected; el !== common && el; el = el.parentElement) {
        el.classList.remove(cssClass.selected);
        this.triggerFocusChange(el, null);
      }
      for (let el = next; el !== common && el; el = el.parentElement) {
        el.classList.add(cssClass.selected);
        this.triggerFocusChange(el, next);
        this.parents.push(el);
      }
      for (let el = common; el !== this.root && el; el = el.parentElement) {
        this.triggerFocusChange(el, next);
        this.parents.push(el);
      }
    } else {
      // Trigger focus changes and add selected classes everywhere
      // from the target element to the root.
      for (let el = next; el !== this.root && el; el = el.parentElement) {
        el.classList.add(cssClass.selected);
        this.triggerFocusChange(el, next);
        this.parents.push(el);
      }
    }

    this.referenceRect = next.getBoundingClientRect();
    this.selected = next;
    next.classList.add(cssClass.direct);
    next.focus(); // intentially done last in case onFocusChange fires
  }

  private triggerFocusChange(el: HTMLElement, next: HTMLElement) {
    const directive = this.registry.find(el);
    if (directive) {
      directive.onFocus(next);
    }
  }

  /**
   * Frees resources associated with the service.
   */
  public teardown() {
    this.registrySubscription.unsubscribe();
    this.registrySubscription = null;
  }

  public createArcEvent(direction: Direction): ArcEvent {
    const directional = isDirectional(direction);
    return new ArcEvent({
      directive: this.registry.find(this.selected),
      event: direction,
      next: directional ? this.findNextFocus(direction) : null,
      target: this.selected,
    });
  }

  /**
   * Attempts to effect the focus command, returning a
   * boolean if it was handled.
   */
  public bubble(ev: ArcEvent): boolean {
    if (isNodeAttached(this.selected, this.root)) {
      this.bubbleEvent(ev, false);
    }

    // Abort if the user handled
    if (ev.defaultPrevented) {
      return true;
    }

    // Bubble once more on the target.
    if (ev.next) {
      this.bubbleEvent(ev, true, ev.next);
      if (ev.defaultPrevented) {
        return true;
      }
    }

    return false;
  }

  public defaultFires(ev: ArcEvent, scrollSpeed: number = Infinity): boolean {
    if (ev.defaultPrevented) {
      return true;
    }

    const directional = isDirectional(ev.event);
    if (directional && ev.next !== null) {
      this.selectNode(ev.next, scrollSpeed);
      return true;
    } else if (ev.event === Direction.SUBMIT) {
      this.selected.click();
      return true;
    } else if (ev.event === Direction.BACK) {
      this.location.back();
      return true;
    }

    return false;
  }

  /**
   * Scrolls the page so that the selected element is visible.
   */
  private rescroll(el: HTMLElement, scrollSpeed: number, container: HTMLElement) {
    // Abort if scrolling is disabled.
    if (scrollSpeed === null) {
      return;
    }

    // Animation function to transition a scroll on the `parent` from the
    // `original` value to the `target` value by calling `set.
    const animate = (parent: HTMLElement, target: number, original: number, setter: (x: number) => void) => {
      if (scrollSpeed === Infinity) {
        parent.scrollTop = target;
        return;
      }

      const start = performance.now();
      const duration = Math.abs(target - original) / scrollSpeed * 1000;
      const run = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        setter(quad(original, target, progress));

        if (progress < 1) {
          requestAnimationFrame(run);
        }
      };

      requestAnimationFrame(run);
    };

    // The scroll calculation loop. Starts at the element and goes up, ensuring
    // that the element (or the box where the element will be after scrolling
    // is applied) is visible in all containers.
    const rect = el.getBoundingClientRect();
    const { width, height, top, left } = rect;

    for (let parent = el.parentElement; parent !== container.parentElement && parent; parent = parent.parentElement) {

      // Special case: treat the body as the viewport as far as scrolling goes.
      let prect: IReducedClientRect;
      if (parent === container) {
        const containerStyle = window.getComputedStyle(container, null);
        const paddingTop = Number(containerStyle.paddingTop.slice(0, -2));
        const paddingBottom = Number(containerStyle.paddingBottom.slice(0, -2));
        const paddingLeft = Number(containerStyle.paddingLeft.slice(0, -2));
        const paddingRight = Number(containerStyle.paddingRight.slice(0, -2));
        prect = {
          top: paddingTop,
          left: paddingLeft,
          height: container.clientHeight - paddingTop - paddingBottom,
          width: container.clientWidth - paddingLeft - paddingRight,
        };
      } else {
        prect = parent.getBoundingClientRect();
      }

      // Trigger if this element has a vertical scrollbar
      if (parent.scrollHeight > parent.clientHeight) {
        const scrollTop = parent.scrollTop;
        const showsTop = scrollTop + (top - prect.top);
        const showsBottom = showsTop + (height - prect.height);

        if (showsTop < scrollTop) {
          animate(parent, showsTop, scrollTop, x => parent.scrollTop = x);
        } else if (showsBottom > scrollTop) {
          animate(parent, showsBottom, scrollTop, x => parent.scrollTop = x);
        }
      }

      // Trigger if this element has a horizontal scrollbar
      if (parent.scrollWidth > parent.clientWidth) {
        const scrollLeft = parent.scrollLeft;
        const showsLeft = scrollLeft + (left - prect.left);
        const showsRight = showsLeft + (width - prect.width);

        if (showsLeft < scrollLeft) {
          animate(parent, showsLeft, scrollLeft, x => parent.scrollLeft = x);
        } else if (showsRight > scrollLeft) {
          animate(parent, showsRight, scrollLeft, x => parent.scrollLeft = x);
        }
      }
    }
  }

  /**
   * Bubbles the ArcEvent from the currently selected element
   * to all parent arc directives.
   */
  private bubbleEvent(ev: ArcEvent, incoming: boolean, source: HTMLElement = this.selected): ArcEvent {
    for (let el = source; !ev.propagationStopped && el !== this.root && el; el = el.parentElement) {
      if (el === undefined) {
        console.warn(
          `arcade-machine focusable element <${el.tagName}> was moved outside of` +
          'the focus root. We may not be able to handle focus correctly.',
          el,
        );
        break;
      }

      const directive = this.registry.find(el);
      if (directive) {
        if (incoming && directive.onIncoming) {
          directive.onIncoming(ev);
        } else if (!incoming && directive.onOutgoing) {
          directive.onOutgoing(ev);
        }
      }
    }

    return ev;
  }

  /**
   * Returns if the element can receive focus.
   */
  private isFocusable(el: HTMLElement): boolean {
    const record = this.registry.find(el);
    if (record && record.excludeThis && record.excludeThis()) {
      return false;
    }

    const tabIndex = el.getAttribute('tabIndex');

    if (!!tabIndex && Number(tabIndex) < 0) {
      return false;
    }

    // check visibility
    if (!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)) { return false; }

    for (let parent = el; parent; parent = parent.parentElement) {
      const parentRecord = this.registry.find(parent);
      if (parentRecord && parentRecord.exclude && parentRecord.exclude()) {
        return false;
      }
    }

    const role = el.getAttribute('role');
    if (role && focusableRoles.indexOf(role) > -1) {
      return true;
    }

    return el.tagName === 'A'
      || el.tagName === 'BUTTON'
      || el.tagName === 'INPUT'
      || el.tagName === 'SELECT'
      || el.tagName === 'TEXTAREA'
      || (!!tabIndex && Number(tabIndex) >= 0)
      || !!record;
  }

  /**
   * Reset the focus if arcade-machine wanders out of root
   */
  private setDefaultFocus(scrollSpeed: number) {
    const { selected } = this;
    const focusableElems = this.focusRoot.querySelectorAll('*');
    for (let i = 0; i < focusableElems.length; i += 1) {
      const potentialElement = <HTMLElement>focusableElems[i];
      if (selected === potentialElement || !this.isFocusable(potentialElement)) {
        continue;
      }
      const potentialRect = roundRect(potentialElement.getBoundingClientRect());
      // Skip elements that have either a width of zero or a height of zero
      if (potentialRect.width === 0 || potentialRect.height === 0) {
        continue;
      }

      this.selectNode(potentialElement, scrollSpeed);
      return;
    }
  }

  /**
   * Looks for and returns the next focusable element in the given direction.
   * It can return null if no such element is found.
   */
  private findNextFocus(direction: Direction) {
    const { root, selected, historyRect } = this;

    // Don't attempt to focus to elemenents which are not displayed on the screen.
    const maxDistance = Math.max(screen.availHeight, screen.availWidth);
    const referenceRect = isNodeAttached(selected, root)
      ? selected.getBoundingClientRect()
      : this.referenceRect;

    // Calculate scores for each element in the root
    const bestPotential = {
      element: <HTMLElement>null,
      rect: <ClientRect>null,
      score: 0,
    };

    // Note for future devs: copying from the MS project, I thought the below
    // method of transversal would be slow, but it's actually really freaking
    // fast. Like, 6 million op/sec on complex pages. So don't bother trying
    // to optimize it unless you have to.
    const focusableElems = this.focusRoot.querySelectorAll('*');
    for (let i = 0; i < focusableElems.length; i += 1) {
      const potentialElement = <HTMLElement>focusableElems[i];
      if (selected === potentialElement || !this.isFocusable(potentialElement)) {
        continue;
      }
      const potentialRect = roundRect(potentialElement.getBoundingClientRect());
      // Skip elements that have either a width of zero or a height of zero
      if (potentialRect.width === 0 || potentialRect.height === 0) {
        continue;
      }

      const score = calculateScore(direction, maxDistance, historyRect, referenceRect, potentialRect);
      if (score > bestPotential.score) {
        bestPotential.element = potentialElement;
        bestPotential.rect = potentialRect;
        bestPotential.score = score;
      }
    }

    if (!bestPotential.element) {
      return null;
    }

    this.updateHistoryRect(direction, {
      element: bestPotential.element,
      rect: bestPotential.rect,
      referenceRect,
    });

    return bestPotential.element;
  }

  private updateHistoryRect(direction: Direction, result: {
    element: HTMLElement,
    rect: ClientRect,
    referenceRect: ClientRect,
  }) {
    const newHistoryRect: IMutableClientRect = Object.assign({}, defaultRect);
    // It's possible to get into a situation where the target element has
    // no overlap with the reference edge.
    //
    //..╔══════════════╗..........................
    //..║   reference  ║..........................
    //..╚══════════════╝..........................
    //.....................╔═══════════════════╗..
    //.....................║                   ║..
    //.....................║       target      ║..
    //.....................║                   ║..
    //.....................╚═══════════════════╝..
    //
    // If that is the case, we need to reset the coordinates to
    // the edge of the target element.
    if (direction === Direction.LEFT || direction === Direction.RIGHT) {
      newHistoryRect.top = Math.max(
        result.rect.top,
        result.referenceRect.top,
        this.historyRect ? this.historyRect.top : Number.MIN_VALUE,
      );
      newHistoryRect.bottom = Math.min(
        result.rect.bottom,
        result.referenceRect.bottom,
        this.historyRect ? this.historyRect.bottom : Number.MAX_VALUE,
      );

      if (newHistoryRect.bottom <= newHistoryRect.top) {
        newHistoryRect.top = result.rect.top;
        newHistoryRect.bottom = result.rect.bottom;
      }
      newHistoryRect.height = newHistoryRect.bottom - newHistoryRect.top;
      newHistoryRect.width = Number.MAX_VALUE;
      newHistoryRect.left = Number.MIN_VALUE;
      newHistoryRect.right = Number.MAX_VALUE;
    } else {
      newHistoryRect.left = Math.max(
        result.rect.left,
        result.referenceRect.left,
        this.historyRect ? this.historyRect.left : Number.MIN_VALUE,
      );
      newHistoryRect.right = Math.min(
        result.rect.right,
        result.referenceRect.right,
        this.historyRect ? this.historyRect.right : Number.MAX_VALUE,
      );

      if (newHistoryRect.right <= newHistoryRect.left) {
        newHistoryRect.left = result.rect.left;
        newHistoryRect.right = result.rect.right;
      }
      newHistoryRect.width = newHistoryRect.right - newHistoryRect.left;
      newHistoryRect.height = Number.MAX_VALUE;
      newHistoryRect.top = Number.MIN_VALUE;
      newHistoryRect.bottom = Number.MAX_VALUE;
    }
    this.historyRect = newHistoryRect;
  }
}
