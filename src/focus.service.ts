import { Injectable } from '@angular/core';

export enum Direction {
  LEFT,
  RIGHT,
  UP,
  DOWN,
  SUBMIT,
  BACK,
}

@Injectable()
export class FocusService {

  /**
   * Attempts to effect the focus command, returning a
   * boolean if it was handled.
   */
  public fire(direction: Direction): boolean {
    return true;
  }
}
