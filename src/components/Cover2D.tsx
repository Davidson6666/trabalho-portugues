/**
 * Capa da versão 2D (sem WebGL ou aparelho fraco).
 * Mesmo fluxo da capa 3D: clique ou arraste abre; ao fechar, a capa volta.
 */
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { content } from '../lib/content';
import type { ScenePhase } from '../scene/Scene3D';

interface Props {
  phase: ScenePhase;
  closeMode: 'front' | 'back';
  reducedMotion: boolean;
  onRequestOpen: () => void;
  onOpened: () => void;
  onClosed: () => void;
}

export function Cover2D({ phase, closeMode, reducedMotion, onRequestOpen, onOpened, onClosed }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const d = reducedMotion ? 0.01 : 1;

  useEffect(() => {
    const root = rootRef.current;
    const front = frontRef.current;
    if (!root || !front) return;
    if (phase === 'opening') {
      const tl = gsap.timeline({ onComplete: onOpened });
      tl.to(front, { rotateY: -170, duration: 1.1 * d, ease: 'power2.inOut' }).to(root, { opacity: 0, duration: 0.4 * d }, '-=0.3');
      return () => void tl.kill();
    }
    if (phase === 'closing' && closeMode === 'back') {
      // Fim do livro: aparece a contracapa e o livro vira sozinho para a capa
      gsap.set(root, { opacity: 1 });
      gsap.set(front, { rotateY: 0 });
      const tl = gsap.timeline({ onComplete: onClosed });
      tl.fromTo(bookRef.current, { rotateY: -180, y: 0 }, { rotateY: 0, duration: 1.3 * d, ease: 'power2.inOut', delay: 0.3 * d })
        .to(bookRef.current, { y: -40, duration: 0.65 * d, ease: 'power2.out' }, 0.3 * d)
        .to(bookRef.current, { y: 0, duration: 0.65 * d, ease: 'bounce.out' }, 0.95 * d);
      return () => void tl.kill();
    }
    if (phase === 'closing') {
      gsap.set(root, { opacity: 1 });
      const tl = gsap.timeline({ onComplete: onClosed });
      tl.fromTo(front, { rotateY: -170 }, { rotateY: 0, duration: 1 * d, ease: 'power2.inOut', delay: 0.2 * d });
      return () => void tl.kill();
    }
    if (phase === 'cover' || phase === 'intro') gsap.set([root, front], { clearProps: 'opacity,transform' });
  }, [phase, closeMode, d, onOpened, onClosed]);

  if (phase === 'reading') return null;

  return (
    <div className="cover2d" ref={rootRef} aria-hidden="true">
      <div className="cover2d-book" ref={bookRef}>
        <div className="cover2d-back" />
        <div className="cover2d-pages" />
        <div
          className="cover2d-front"
          ref={frontRef}
          onPointerDown={(e) => (startX.current = e.clientX)}
          onPointerUp={(e) => {
            if (phase !== 'cover' || startX.current == null) return;
            const dx = startX.current - e.clientX;
            startX.current = null;
            if (Math.abs(dx) < 6 || dx > 40) onRequestOpen();
          }}
        >
          <div className="cover2d-frame">
            <span className="cover2d-orn">❦</span>
            <h2>{content.site.bookTitle}</h2>
            <div className="cover2d-rule" />
            <p>{content.site.bookAuthor}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
