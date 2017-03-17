import { Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { FocusService } from '../../../../src';

@Component({
  selector: 'benchmark-page',
  template: `
  <div>
    <label>Iterations<input type="number" [(ngModel)]="iterations"></label>
    <button (click)="runTest(iterations, enableArcExclude, focusTabIndexOnly)">Start Test</button>
    <label><input type="checkbox" [(ngModel)]="enableArcExclude">enableArcExclude</label>
    <label><input type="checkbox" [(ngModel)]="focusTabIndexOnly">focusTabIndexOnly</label>
  </div>
  <div *ngIf="results">
    <h2>Results</h2>
    <div *ngFor="let result of results">{{result}}</div>
  </div>
  <div class="test-subjects">
    <div #tiles class="another-component" *ngFor="let tile of tiles">
      <div class="another-container">
        <div class="component">
          <div class="container">
            <div tabIndex="0" class="inner-component">
              <h1>{{tile}}</h1>
              <p>Some random text here</p>
              <button>Dont Click me</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .test-subjects{display: flex; flex-wrap: wrap;}
    .inner-component{ border: 1px solid green; }
    .another-container.arc--selected{border: 1px solid red; }
  `],
})
export class BenchmarkPageComponent {
  public tiles: string[];
  public iterations = 500;
  public results: string[] = [];
  public testElems = 100;

  public focusTabIndexOnly = false;
  public enableArcExclude = true;

  @ViewChildren('tiles') public tilesElemRef: QueryList<ElementRef>;

  constructor(
    private focusService: FocusService,
  ) {
    this.initTestElems(this.testElems);
  }

  public runTest(iterations: number, enableArcExclude: boolean, focusTabIndexOnly: boolean) {
    this.focusService.enableArcExclude = enableArcExclude;
    this.focusService.focusTabIndexOnly = focusTabIndexOnly;

    this.focusService.selectNode(this.tilesElemRef.first.nativeElement, Infinity);
    let keyCode = 39;
    let count = 0;
    const t1 = performance.now();
    const interval = setInterval(() => {
      this.simulateKeyEvent(keyCode);
      keyCode = keyCode < 40 ? keyCode + 1 : 37;
      count = count + 1;
      if (count > iterations) {
        const totalDuration = performance.now() - t1;
        this.results.push(`${totalDuration}ms, focusTabIndexOnly=${focusTabIndexOnly}, enableArcExclude= ${enableArcExclude}`);
        clearInterval(interval);
      }
    });
  }

  private initTestElems(count: number) {
    this.tiles = [];
    for (let i = 0; i < count; i++) {
      this.tiles.push('Tile: ' + i);
    }
  }

  private simulateKeyEvent(keyCode: number) {
    const e = <any>(new Event('keydown'));
    e.keyCode = keyCode;
    e.which = e.keyCode;
    e.altKey = false;
    e.ctrlKey = true;
    e.shiftKey = false;
    e.metaKey = false;
    window.dispatchEvent(e);
  }
}
