import { Direction } from '../model';

interface IPoint {
  x: number;
  y: number;
}

interface IPotentialElement {
  element: HTMLElement;
  rect: ClientRect;
  displacement: number;
  score: number;
}

export function findElByDistance(direction: Direction, candidates: HTMLElement[], refRect: ClientRect): HTMLElement | null {
  let potentialElements: IPotentialElement[] = [];

  for (let i = 0; i < candidates.length; i++) {
    potentialElements.push({
      element: candidates[i],
      rect: candidates[i].getBoundingClientRect(),
      displacement: Infinity,
      score: Infinity,
    });
  }

  potentialElements = potentialElements.filter(potEl => isInDirection(direction, refRect, potEl.rect));
  if (!potentialElements.length) {
    return null;
  }

  const elementsInShadow = potentialElements.filter(potEl => isInShadow(direction, potEl.rect, refRect));
  if (elementsInShadow.length) {
    return getClosestElement(direction, refRect, elementsInShadow).element;
  }

  potentialElements.forEach(potEl => potEl.score = getScore(direction, refRect, potEl.rect));

  const winner = potentialElements.reduce((prevEl, currEl) => {
    return currEl.score > prevEl.score ? currEl : prevEl;
  });

  return winner.score === Infinity ? null : winner.element;
}

function getClosestElement(direction: Direction, refRect: ClientRect, potentialElements: IPotentialElement[]) {
  potentialElements.forEach(potEl => potEl.displacement = getPrimaryAxisDistance(direction, refRect, potEl.rect));

  return potentialElements.reduce((prevEl, currEl) => {
    if (currEl.displacement === prevEl.displacement) {
      const currElDisplacement = getAbsDistance(getCenter(refRect), getCenter(currEl.rect));
      const prevElDisplacement = getAbsDistance(getCenter(refRect), getCenter(prevEl.rect));
      return currElDisplacement < prevElDisplacement ? currEl : prevEl;
    }

    return currEl.displacement < prevEl.displacement ? currEl : prevEl;
  });
}

function isInDirection(direction: Direction, refRect: ClientRect, targetRect: ClientRect) {
  switch (direction) {
    case Direction.LEFT:
      return targetRect.right <= refRect.left;
    case Direction.RIGHT:
      return targetRect.left >= refRect.right;
    case Direction.UP:
      return targetRect.bottom <= refRect.top;
    case Direction.DOWN:
      return targetRect.top >= refRect.bottom;
    default:
      throw new Error(`Invalid direction ${direction}`);
  }
}

function getScore(direction: Direction, refRect: ClientRect, targetRect: ClientRect): number {
  const absDistance = getAbsDistance(getCenter(refRect), getCenter(targetRect));
  const secondaryAxisDistance = getSecondaryAxisDistance(direction, getCenter(refRect), getCenter(targetRect));
  return 1 / (absDistance + secondaryAxisDistance);
}

function getCenter(rect: ClientRect): IPoint {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function isInShadow(direction: Direction, refRect: ClientRect, targetRect: ClientRect): boolean {
  switch (direction) {
    case Direction.LEFT:
    case Direction.RIGHT:
      return !(refRect.top > targetRect.bottom || refRect.bottom < targetRect.top);
    case Direction.UP:
    case Direction.DOWN:
      return !(refRect.left > targetRect.right || refRect.right < targetRect.left);
    default:
      throw new Error(`Invalid direction ${direction}`);
  }
}

function getPrimaryAxisDistance(direction: Direction, refRect: ClientRect, targetRect: ClientRect) {
  switch (direction) {
    case Direction.LEFT:
      return refRect.left - targetRect.right;
    case Direction.RIGHT:
      return targetRect.left - refRect.right;
    case Direction.UP:
      return refRect.top - targetRect.bottom;
    case Direction.DOWN:
      return targetRect.top - refRect.bottom;
    default:
      throw new Error(`Invalid direction ${direction}`);
  }
}

function getSecondaryAxisDistance(direction: Direction, refCenter: IPoint, targetCenter: IPoint) {
  switch (direction) {
    case Direction.LEFT:
    case Direction.RIGHT:
      return Math.abs(refCenter.y - targetCenter.y);
    case Direction.UP:
    case Direction.DOWN:
      return Math.abs(refCenter.x - targetCenter.x);
    default:
      throw new Error(`Invalid direction ${direction}`);
  }
}

function getAbsDistance(p1: IPoint, p2: IPoint): number {
  return Math.hypot((p1.x - p2.x), (p1.y - p2.y));
}
