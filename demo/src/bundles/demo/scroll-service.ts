import { EventEmitter, Injectable } from '@angular/core';

const defaultDuration = 500; //ms

@Injectable()
export class ScrollService {
  public scrollCompleted = new EventEmitter();
  private scrollContainer: HTMLElement;
  private startTime: number;
  private duration: number;
  private startOffset: number;
  private endOffset: number;
  private raf: number;

  public smoothScroll(scrollContainer: HTMLElement, endOffset: number, duration?: number) {
    cancelAnimationFrame(this.raf);
    this.duration = duration || defaultDuration;
    this.scrollContainer = scrollContainer || <any>window;
    this.startOffset = scrollContainer.scrollTop || window.pageYOffset;
    this.endOffset = endOffset < 0 ? 0 : endOffset;
    this.startTime = performance.now();

    this.step(this.startTime);
  }

  private step(currentTime: number) {
    const elapsed = currentTime - this.startTime;
    if (this.scrollContainer !== <any>window) {
      this.scrollContainer.scrollTop = this.getPositionAt(elapsed);
    } else {
      window.scroll(0, this.getPositionAt(elapsed));
    }

    if (elapsed < this.duration) {
      this.raf = window.requestAnimationFrame(now => this.step(now));
    } else {
      this.scrollCompleted.next();
    }
  };

  private getPositionAt(elapsedTime: number) {
    if (elapsedTime > this.duration) { return this.endOffset; }
    return this.startOffset + (this.endOffset - this.startOffset) * this.easeOutCubic(elapsedTime / this.duration);
  }

  private easeOutCubic(t: number) { return (t - 1) ** 3 + 1; }
}
