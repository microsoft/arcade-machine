import { EventEmitter, Injectable } from '@angular/core';

const defaultDuration = 500; //ms

@Injectable()
export class ScrollService {
  public scrollCompleted = new EventEmitter();
  private scrollContainer?: HTMLElement | Window;
  private startTime?: number;
  private duration?: number;
  private startOffset?: number;
  private endOffset?: number;
  private raf?: number;

  public smoothScroll(scrollContainer: HTMLElement | Window = window, endOffset: number, duration?: number) {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
    }
    this.duration = duration || defaultDuration;
    this.scrollContainer = scrollContainer;
    this.startOffset = scrollContainer instanceof Window ? scrollContainer.scrollY : scrollContainer.scrollTop;
    this.endOffset = endOffset < 0 ? 0 : endOffset;
    this.startTime = performance.now();

    this.step(this.startTime);
  }

  private step(currentTime: number) {
    if (this.startTime === undefined || this.scrollContainer === undefined || this.duration === undefined) {
      throw new Error('Not initialized');
    }
    const elapsed = currentTime - this.startTime;
    if (this.scrollContainer instanceof Window) {
      window.scroll(0, this.getPositionAt(elapsed));
    } else {
      this.scrollContainer.scrollTop = this.getPositionAt(elapsed);
    }

    if (elapsed < this.duration) {
      this.raf = window.requestAnimationFrame(now => this.step(now));
    } else {
      this.scrollCompleted.next();
    }
  }

  private getPositionAt(elapsedTime: number): number {
    if (this.startTime === undefined ||
      this.scrollContainer === undefined ||
      this.duration === undefined ||
      this.endOffset === undefined ||
      this.startOffset === undefined) {
      throw new Error('Not initialized');
    }

    if (elapsedTime > this.duration) {
      return this.endOffset;
    }
    return this.startOffset + (this.endOffset - this.startOffset) * this.easeOutCubic(elapsedTime / this.duration);
  }

  private easeOutCubic(t: number) { return (t - 1) ** 3 + 1; }
}
