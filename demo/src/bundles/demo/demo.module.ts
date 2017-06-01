import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  NgModule,
  OnDestroy,
  Output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { BenchmarkPageComponent } from './benchmark-page.component';

import 'rxjs/add/observable/interval';
import 'rxjs/add/operator/take';

import { ArcModule, Direction, FocusService, InputService, RegistryService } from '../../../../src';
import { Page1Component } from './page1.component';
import { Page2Component } from './page2.component';
import { ScrollService } from './scroll-service';
import { SmoothScrollPageComponent } from './smooth-scroll.component';

@Component({
  selector: 'demo-app',
  template: `
    <nav>
      <a [routerLink]="['/page1']">Page1</a>
      <a [routerLink]="['/page2']">Page2</a>
      <a [routerLink]="['/smooth-scroll']">Smooth Scroll</a>
      <a [routerLink]="['/benchmark']">Benchmark</a>
    </nav>
    <h1>Arcade Machine Demo</h1>
    <router-outlet></router-outlet>
    `,
})
export class DemoAppComponent implements AfterViewInit {
  constructor(private inputService: InputService) {
    const nav: any = navigator;
    nav.gamepadInputEmulation = 'keyboard';

    Observable.fromEvent<KeyboardEvent>(window, 'keydown')
      .filter(ev => this.inputService.codeDirectionMap.get(ev.keyCode) === Direction.BACK)
      .subscribe((ev: KeyboardEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
      });
  }

  public ngAfterViewInit() {
    this.inputService.bootstrap();
  }
}

@Component({
  selector: 'dialog',
  template: `
  <ng-content></ng-content>
  <div>
    <button (click)="onClose.emit()">Close</button>
  </div>
  `,
  styles: [`
    :host{
      display: block;
      position: fixed;
      top: 45vh;
      left: 45vw;
      border: 2px solid blue;
      padding: 50px;
      background: white;
    }

    button { margin: 10px; }
  `],
})
export class DialogComponent implements AfterViewInit, OnDestroy {
  @Output() public onClose = new EventEmitter();

  constructor(
    private focusService: FocusService,
    private inputService: InputService,
    private hostElem: ElementRef,
  ) { }

  public ngAfterViewInit() {
    Observable.fromEvent<KeyboardEvent>(this.hostElem.nativeElement, 'keydown')
      .filter(ev => this.inputService.codeDirectionMap.get(ev.keyCode) === Direction.BACK)
      .take(1)
      .subscribe((ev: KeyboardEvent) => {
        ev.preventDefault();
        this.onClose.emit();
      });

    this.focusService.trapFocus(this.hostElem.nativeElement);
  }
  public ngOnDestroy() {
    this.focusService.releaseFocus(this.hostElem.nativeElement);
  }
}

const routes = [
  { path: '', pathMatch: 'full', redirectTo: 'page1' },
  { path: 'page1', component: Page1Component },
  { path: 'page2', component: Page2Component },
  { path: 'smooth-scroll', component: SmoothScrollPageComponent },
  { path: 'benchmark', component: BenchmarkPageComponent },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes),
    BrowserModule,
    ArcModule,
    FormsModule,
  ],
  providers: [
    Location,
    {
      provide: LocationStrategy,
      useClass: PathLocationStrategy,
    },
    FocusService,
    InputService,
    RegistryService,
    ScrollService,
  ],
  declarations: [
    DemoAppComponent,
    Page1Component,
    Page2Component,
    SmoothScrollPageComponent,
    BenchmarkPageComponent,
    DialogComponent,
  ],
  bootstrap: [
    DemoAppComponent,
  ],
})
export class AppModule {
}
