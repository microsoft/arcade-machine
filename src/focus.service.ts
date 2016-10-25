import { Injectable } from '@angular/core';

export enum Direction {
  LEFT,
  RIGHT,
  UP,
  DOWN,
  SUBMIT,
  BACK,
}

const focusableTests: ((el: Element) => boolean)[] = [
  e => e.tagName === 'A',
  e => e.tagName === 'BUTTON',
  e => e.tagName === 'INPUT',
  e => e.tagName === 'SELECT',
  e => e.tagName === 'TEXTAREA',
  e => e.hasAttribute('arc'),
];

const isFocusable = (el: Element) => {
  return focusableTests.some(test => test(el));
};

const getEnhancedRect = (rect: Element | ClientRect) => {
  if (rect instanceof Element) {
    rect = rect.getBoundingClientRect();
  }

  return {
    top: Math.floor(rect.top),
    bottom: Math.floor(rect.top + rect.height),
    right: Math.floor(rect.left + rect.width),
    left: Math.floor(rect.left),
    height: Math.floor(rect.height),
    width: Math.floor(rect.width),
  };
}

const ScoringConstants = Object.freeze({
    primaryAxisDistanceWeight: 30,
    secondaryAxisDistanceWeight: 20,
    percentInHistoryShadowWeight: 100000
});

@Injectable()
export class FocusService {

  private root: HTMLElement;
  private observer: MutationObserver;
  private historyRect: ClientRect;
  private selected: HTMLElement;

  constructor() {
    // this.observer = new MutationObserver((mutations) => {
    //   mutations.forEach(mut => {
    //     for (let i = 0; i < mut.removedNodes.length; i++) {

    //     }
    //   });
    // });
  }

  public setRoot(root: HTMLElement) {
    this.root = root;
  }

  public selectNode(el: HTMLElement) {
  }

  /**
   * Attempts to effect the focus command, returning a
   * boolean if it was handled.
   */
  public fire(direction: Direction): boolean {
    return true;
  }

  private findNextFocus(direction: Direction) {
    const { root, selected, historyRect } = this;
    const referenceRect = selected.getBoundingClientRect();

    const maxDistance = Math.max(screen.availHeight, screen.availWidth);
    if (selected) {
      // todo: handle direcitonal overrides
      // var overrideSelector = refElement.getAttribute("data-tv-focus-" + direction);
      // if (overrideSelector) {
      //   if (overrideSelector) {
      //     var target;
      //     var element = refObj.element;
      //     while (!target && element) {
      //       target = element.querySelector(overrideSelector);
      //       element = element.parentElement;
      //     }
      //     if (target) {
      //       if (target === document.activeElement) {
      //         return null;
      //       }
      //       return {
      //         target: target,
      //         targetRect: _toIRect(target.getBoundingClientRect()),
      //         referenceRect: refObj.rect,
      //         usedOverride: true
      //       };
      //     }
      //   }
      // }
    }
    // Calculate scores for each element in the root
    const bestPotential = {
      element: <Element> null,
      rect: <ClientRect> null,
      score: 0
    };
    const allElements = root.querySelectorAll('*');
    for (let i = 0; i < allElements.length; i++) {
      var potentialElement = allElements[i];
      if (selected === potentialElement || !isFocusable(potentialElement)) {
        continue;
      }
      var potentialRect = getEnhancedRect(potentialElement.getBoundingClientRect());
      // Skip elements that have either a width of zero or a height of zero
      if (potentialRect.width === 0 || potentialRect.height === 0) {
        continue;
      }
      var score = calculateScore(direction, maxDistance, historyRect, referenceRect, potentialRect);
      if (score > bestPotential.score) {
        bestPotential.element = potentialElement;
        bestPotential.rect = potentialRect;
        bestPotential.score = score;
      }
    }

    return bestPotential.element;

    // Nested Helpers
    function calculatePercentInShadow(
      minReferenceCoord: number,
      maxReferenceCoord: number,
      minPotentialCoord: number,
      maxPotentialCoord: number
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
      potentialRect: ClientRect
    ): number {
      var percentInShadow: number;
      var primaryAxisDistance: number;
      var secondaryAxisDistance = 0;
      var percentInHistoryShadow = 0;
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
          return primaryAxisDistance * ScoringConstants.primaryAxisDistanceWeight
            + secondaryAxisDistance * ScoringConstants.secondaryAxisDistanceWeight
            + percentInHistoryShadow * ScoringConstants.percentInHistoryShadowWeight;
        }
      }
      return 0;
    }
  }
}
