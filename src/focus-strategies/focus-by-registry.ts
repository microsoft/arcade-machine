import { Direction, IArcHandler } from '../model';
export class FocusByRegistry {
  public findNextFocus(direction: Direction, arcHandler: IArcHandler) {
    const selectedEl = arcHandler;
    if (selectedEl) {
      switch (direction) {
        case Direction.LEFT:
          if (selectedEl.arcFocusLeft) {
            return this.getElement(selectedEl.arcFocusLeft);
          }
          break;
        case Direction.RIGHT:
          if (selectedEl.arcFocusRight) {
            return this.getElement(selectedEl.arcFocusRight);
          }
          break;
        case Direction.UP:
          if (selectedEl.arcFocusUp) {
            return this.getElement(selectedEl.arcFocusUp);
          }
          break;
        case Direction.DOWN:
          if (selectedEl.arcFocusDown) {
            return this.getElement(selectedEl.arcFocusDown);
          }
          break;
        default:
      }
    }
    return null;
  }


  private getElement(el: (HTMLElement | string)) {
    if (typeof el === 'string') {
      return <HTMLElement>document.querySelector(el);
    }

    return el;
  };
}
