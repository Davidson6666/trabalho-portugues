/** Tipos mínimos do StPageFlip (o pacote não traz .d.ts). */
declare module 'page-flip/dist/js/page-flip.module.js' {
  export type FlipCorner = 'top' | 'bottom';
  export interface FlipEvent<T = unknown> {
    data: T;
  }
  export interface FlipSettings {
    width: number;
    height: number;
    size?: 'fixed' | 'stretch';
    startPage?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    swipeDistance?: number;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
  }
  export class PageFlip {
    constructor(el: HTMLElement, settings: FlipSettings);
    loadFromHTML(items: HTMLElement[]): void;
    updateFromHtml(items: HTMLElement[]): void;
    flipNext(corner?: FlipCorner): void;
    flipPrev(corner?: FlipCorner): void;
    flip(page: number, corner?: FlipCorner): void;
    turnToPage(page: number): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): 'portrait' | 'landscape';
    getState(): 'user_fold' | 'fold_corner' | 'flipping' | 'read';
    getSettings(): FlipSettings;
    update(): void;
    /** Coordenadas relativas à área do livro. */
    startUserTouch(pos: { x: number; y: number }): void;
    userMove(pos: { x: number; y: number }, isTouch: boolean): void;
    userStop(pos: { x: number; y: number }, isSwipe?: boolean): void;
    on(event: 'flip' | 'changeState' | 'changeOrientation' | 'init' | 'update', cb: (e: FlipEvent<never>) => void): PageFlip;
  }
}
