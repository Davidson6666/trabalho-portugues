/**
 * Fluxo geral do site (máquina de estados):
 *
 *   intro ──▶ cover ──▶ opening ──▶ reading ──▶ closing ──▶ cover ...
 *
 * - intro:   abertura com as polaroides; o resto carrega escondido.
 * - cover:   livro fechado (3D ou 2D), espera clique/arraste.
 * - opening: capa abrindo; o livro HTML é montado e paginado por baixo.
 * - reading: livro HTML visível (folhear, sumário, etc.).
 * - closing: livro HTML some e a capa fecha.
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Intro } from './components/Intro';
import { Cover2D } from './components/Cover2D';
import { Settings } from './components/Settings';
import { Dust2D } from './components/Dust2D';
import { SceneBoundary } from './components/SceneBoundary';
import { Book, BOOKMARK_KEY, type Bookmark } from './book/Book';
import type { ScenePhase, Theme } from './scene/Scene3D';
import { allImageUrls, content } from './lib/content';
import { startTask, trackFonts, trackImages } from './lib/readiness';
import { canUse3D, prefersReducedMotion } from './lib/capabilities';
import { load, loadRaw, save } from './lib/storage';
import { setSoundEnabled } from './lib/sound';
import { fullscreenSupported, toggleFullscreen, useIsFullscreen } from './lib/fullscreen';

// three.js só é baixado se for usado (fica fora do bundle inicial)
const Scene3D = lazy(() => import('./scene/Scene3D'));

const PREFS_KEY = 'qb:preferencias';
interface Prefs {
  theme: Theme;
  particles: boolean;
}

/* Tarefas de carregamento registradas uma única vez, antes do primeiro render */
const use3DInitially = canUse3D();
trackFonts();
trackImages(allImageUrls(content));
let finishSceneTask: (() => void) | null = use3DInitially ? startTask('scene') : null;

function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

export default function App() {
  const [phase, setPhase] = useState<ScenePhase>('intro');
  const [mode, setMode] = useState<'3d' | '2d'>(use3DInitially ? '3d' : '2d');
  const [prefs, setPrefs] = useState<Prefs>(() => load<Prefs>(PREFS_KEY, { theme: 'claro', particles: true }));
  const [sound, setSound] = useState(false); // desligado por padrão
  const [bookmark, setBookmark] = useState<Bookmark | null>(() => loadRaw<Bookmark>(BOOKMARK_KEY));
  const [startAt, setStartAt] = useState<Bookmark | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const reducedMotion = useReducedMotion();
  const fullscreen = useIsFullscreen();
  const openBtnRef = useRef<HTMLButtonElement>(null);

  /* Tema aplicado no <html> e preferências salvas */
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    save(PREFS_KEY, prefs);
  }, [prefs]);

  /* Cena 3D: se não ficar pronta em 12 s, desiste e usa o 2D */
  useEffect(() => {
    if (!finishSceneTask) return;
    const id = window.setTimeout(() => finishSceneTask && fallbackTo2D(), 12000);
    return () => window.clearTimeout(id);
  }, []);

  const sceneReady = useCallback(() => {
    finishSceneTask?.();
    finishSceneTask = null;
  }, []);

  const fallbackTo2D = useCallback(() => {
    setMode('2d');
    sceneReady();
  }, [sceneReady]);

  /* ---------- Transições de fase ---------- */
  const onIntroDone = useCallback(() => setPhase('cover'), []);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const open = useCallback(
    (fromBookmark: boolean) => {
      if (phaseRef.current !== 'cover') return;
      phaseRef.current = 'opening';
      setStartAt(fromBookmark ? bookmark : null);
      setOpenCount((c) => c + 1);
      setPhase('opening');
    },
    [bookmark],
  );
  const requestOpen = useCallback(() => open(false), [open]);
  const onOpened = useCallback(() => setPhase('reading'), []);
  /** fromEnd: chegou ao fim → fecha pela contracapa e o livro se vira sozinho */
  const [closeMode, setCloseMode] = useState<'front' | 'back'>('front');
  const closeBook = useCallback((fromEnd: boolean) => {
    setBookmark(loadRaw<Bookmark>(BOOKMARK_KEY));
    if (phaseRef.current !== 'reading') return;
    setCloseMode(fromEnd ? 'back' : 'front');
    setPhase('closing');
  }, []);
  const onClosed = useCallback(() => setPhase('cover'), []);

  // Volta o foco ao botão de abrir quando a capa reaparece
  useEffect(() => {
    if (phase === 'cover') openBtnRef.current?.focus({ preventScroll: true });
  }, [phase]);

  const showBook = phase === 'opening' || phase === 'reading' || phase === 'closing';
  const particlesOn = prefs.particles && !reducedMotion;

  return (
    <div className={`app mode-${mode} phase-${phase}`}>
      {/* Fundo: cena 3D (lazy) ou mesa em CSS */}
      {mode === '3d' ? (
        <SceneBoundary onError={fallbackTo2D}>
          <Suspense fallback={null}>
            <Scene3D
              phase={phase}
              theme={prefs.theme}
              particles={particlesOn}
              reducedMotion={reducedMotion}
              onReady={sceneReady}
              onRequestOpen={requestOpen}
              onOpened={onOpened}
              onClosed={onClosed}
              closeMode={closeMode}
            />
          </Suspense>
        </SceneBoundary>
      ) : (
        <>
          <div className="desk2d" aria-hidden="true" />
          {particlesOn && <Dust2D />}
          <Cover2D
            phase={phase}
            closeMode={closeMode}
            reducedMotion={reducedMotion}
            onRequestOpen={requestOpen}
            onOpened={onOpened}
            onClosed={onClosed}
          />
        </>
      )}

      {/* Atmosfera: vinheta nas bordas + brilho quente do abajur */}
      <div className="atmos" aria-hidden="true" />

      {/* Capa: instruções e botões acessíveis por teclado */}
      {phase === 'cover' && (
        <div className="cover-ui">
          <p className="cover-hint">Clique ou arraste a capa para abrir</p>
          <div className="cover-actions">
            <button ref={openBtnRef} type="button" className="btn btn-gold" onClick={() => open(false)}>
              Abrir o livro
            </button>
            {bookmark && bookmark.number > 1 && (
              <button type="button" className="btn btn-ghost-light" onClick={() => open(true)}>
                Continuar da página {bookmark.number}
              </button>
            )}
          </div>
        </div>
      )}

      {showBook && (
        <Book key={openCount} visible={phase === 'reading'} startAt={startAt} reducedMotion={reducedMotion} onClose={closeBook} />
      )}

      {phase !== 'intro' && (
        <header className="topbar">
          <span className="brand">{content.site.bookTitle}</span>
          <div className="topbar-actions">
            {fullscreenSupported() && (
              <button
                type="button"
                className="btn btn-ghost btn-glass btn-icon"
                onClick={toggleFullscreen}
                aria-pressed={fullscreen}
                aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <path d={fullscreen ? 'M9 4v5H4 M15 4v5h5 M9 20v-5H4 M15 20v-5h5' : 'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5'} />
                </svg>
              </button>
            )}
          <Settings
            theme={prefs.theme}
            sound={sound}
            particles={prefs.particles}
            onTheme={(theme) => setPrefs((p) => ({ ...p, theme }))}
            onSound={(on) => {
              setSound(on);
              setSoundEnabled(on);
            }}
            onParticles={(particles) => setPrefs((p) => ({ ...p, particles }))}
          />
          </div>
        </header>
      )}

      {phase === 'intro' && <Intro reducedMotion={reducedMotion} onDone={onIntroDone} />}
    </div>
  );
}
